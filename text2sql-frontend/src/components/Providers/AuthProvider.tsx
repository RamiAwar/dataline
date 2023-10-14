import { createContext, useContext, useEffect, useState } from "react";
import { Session, User, supabase } from "../../supabase";
import {
  SignUpWithPasswordCredentials,
  SignInWithPasswordCredentials,
} from "@supabase/gotrue-js";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export const CUSTOM_SUPABASE_THEME = {
  theme: ThemeSupa,
  variables: {
    default: {
      colors: {
        brand: "rgb(5, 122, 85)",
        brandAccent: "rgb(14, 159, 110)",
        brandButtonText: "white",
        defaultButtonBackground: "rgb(55, 65, 81)",
        defaultButtonBackgroundHover: "rgb(75, 85, 99)",
        // have border be a little lighter than button bg
        defaultButtonBorder: "rgb(20, 30, 48)",
        defaultButtonText: "white",
        dividerBackground: "gray",
        inputBackground: "transparent",
        inputBorder: "gray",
        inputText: "white",
        inputPlaceholder: "gray",
      },
    },
  },
};

interface UserProfile {
  avatarUrl: string;
  fullName: string;
  updatedAt: string;
}

type AuthContextType = {
  signUp: (data: SignUpWithPasswordCredentials) => Promise<any>;
  signInWithPassword: (data: SignInWithPasswordCredentials) => Promise<any>;
  signOut: () => Promise<any>;
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
};

const AuthContext = createContext<AuthContextType>({
  signUp: () => Promise.resolve(),
  signInWithPassword: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  user: null,
  session: null,
  profile: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    setUser(session?.user ?? null);
    setLoading(false);

    // Get user profile details
    supabase
      .from("profiles")
      .select("avatar_url,full_name,updated_at")
      .single()
      .then(({ data }) => {
        setProfile({
          avatarUrl: data?.avatar_url ?? "",
          fullName: data?.full_name ?? "",
          updatedAt: data?.updated_at ?? "",
        });
      });

    // Listen for changes on auth state (logged in, signed out, etc.) and update session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Fetch profile
      supabase
        .from("profiles")
        .select("avatar_url,full_name,updated_at")
        .single()
        .then(({ data }) => {
          setProfile({
            avatarUrl: data?.avatar_url ?? "",
            fullName: data?.full_name ?? "",
            updatedAt: data?.updated_at ?? "",
          });
        });
    });
    return () => subscription.unsubscribe();
  }, []);

  // Will be passed down to Signup, Login and Dashboard components
  const value = {
    signUp: (data: SignUpWithPasswordCredentials) => supabase.auth.signUp(data),
    signInWithPassword: (data: SignInWithPasswordCredentials) =>
      supabase.auth.signInWithPassword(data),
    signOut: () => supabase.auth.signOut(),
    user,
    session,
    profile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

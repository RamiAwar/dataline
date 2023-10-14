import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { useAuth } from "../Providers/AuthProvider";

export default function Account() {
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  // Manage avatar uploading state
  const [uploading, setUploading] = useState<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    async function getProfile() {
      setLoading(true);

      if (!user) return;

      let { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .single();
      if (error) {
        console.log(error);
      } else if (data) {
        setAvatarUrl(data.avatar_url);
        setFullName(data.full_name);
      }

      setLoading(false);
    }

    getProfile();
  }, [user]);

  async function uploadAvatar(event) {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Update profile avatar URL
      const updates = {
        id: user?.id,
        avatar_url: filePath,
        updated_at: new Date(),
      };

      let { error: updateError } = await supabase
        .from("profiles")
        .upsert(updates);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      alert("Error updating avatar");
      console.log(error);
    } finally {
      setUploading(false);
    }
  }

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const updates = {
      id: user?.id,
      avatar_url: avatarUrl,
      full_name: fullName,
      updated_at: new Date(),
    };

    let { error } = await supabase.from("profiles").upsert(updates);

    if (error) {
      console.log(error.message);
    } else {
      setAvatarUrl(avatarUrl);
    }
    setLoading(false);
  }

  return (
    <div>
      <form onSubmit={updateProfile} className="form-widget">
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="text" value={user?.email} disabled />
        </div>
        <div>
          <label htmlFor="full_name">Full Name</label>
          <input
            id="full_name"
            type="text"
            value={fullName || ""}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <button
            className="button block primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Loading ..." : "Update"}
          </button>
        </div>

        <div>
          <button
            className="button block"
            type="button"
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out
          </button>
        </div>
      </form>

      <div>
        <label className="button primary block" htmlFor="single">
          {uploading ? "Uploading ..." : "Upload"}
        </label>
        <input
          style={{
            visibility: "hidden",
            position: "absolute",
          }}
          type="file"
          id="single"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      </div>
    </div>
  );
}

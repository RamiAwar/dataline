import { FC, PropsWithChildren, useEffect, useRef } from "react";
import { Spinner } from "../Spinner/Spinner";

interface ReverseInfiniteScrollProps extends PropsWithChildren {
  isFetching: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

const ReverseInfiniteScroll: FC<ReverseInfiniteScrollProps> = ({
  isFetching,
  hasNextPage,
  fetchNextPage,
  children,
}) => {
  const topRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isFetching && hasNextPage) {
        fetchNextPage();
      }
    });
    const observerTarget = topRef.current!;
    setTimeout(() => observer.observe(observerTarget), 1000);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetching]);
  return (
    <>
      <div ref={topRef} />
      {isFetching && (
        <div className="flex justify-center items-center h-16 text-white">
          <>
            <Spinner />
            Loading...
          </>
        </div>
      )}

      {children}
    </>
  );
};

export default ReverseInfiniteScroll;

import { BackgroundLayout } from "../Layouts/BackgroundLayout";
import Header from "../Layouts/Header";
import posts from "@components/Landing/posts.json";

export default function Blog() {
  return (
    <>
      <Header />

      <div className="bg-gray-900 overflow-hidden border-r border-white/5">
        <div className="relative isolate pt-12">
          <BackgroundLayout />

          <div className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Our latest blog posts
                </h2>
                <p className="mt-2 text-lg leading-8 text-gray-400">
                  Learn about all the ways DataLine can help
                </p>
              </div>
              <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                {posts.map((post) => (
                  <a href={post.href}>
                    <article
                      key={post.id}
                      className="group flex flex-col items-start justify-between bg-gray-500/10 transition-colors duration-300 hover:bg-gray-200/10 rounded-2xl backdrop-blur-xs p-4"
                    >
                      <div className="relative w-full">
                        <img
                          src={post.imageUrl}
                          alt=""
                          className="aspect-[16/9] w-full rounded-2xl bg-gray-100 object-cover sm:aspect-[2/1] lg:aspect-[3/2]"
                        />
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
                      </div>
                      <div className="max-w-xl">
                        <div className="mt-8 flex items-center gap-x-4 text-xs">
                          <time
                            dateTime={post.datetime}
                            className="text-gray-400"
                          >
                            {post.date}
                          </time>
                          {/* <div className="bg-gray-300 rounded-full p-2">
                            {post.category.title}
                          </div> */}
                        </div>
                        <div className=" relative">
                          <h3 className="mt-3 text-lg font-semibold leading-6 text-white">
                            <a href={post.href}>
                              <span className="absolute inset-0" />
                              {post.title}
                            </a>
                          </h3>
                          <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-300">
                            {post.description}
                          </p>
                        </div>
                        <div className="relative mt-8 flex items-center gap-x-4">
                          <img
                            src={post.author.imageUrl}
                            alt=""
                            className="h-10 w-10 rounded-full bg-gray-100"
                          />
                          <div className="text-sm leading-6">
                            <p className="font-semibold text-gray-300">
                              <a href={post.author.href}>
                                <span className="absolute inset-0" />
                                {post.author.name}
                              </a>
                            </p>
                            <p className="text-gray-400">{post.author.role}</p>
                          </div>
                        </div>
                      </div>
                    </article>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

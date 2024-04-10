const SquareBackground = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative isolate sm:mt-40">
            <svg
                className="absolute inset-0 -z-10 h-full w-full stroke-white/5 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
                aria-hidden="true"
            >
                <defs>
                    <pattern
                        id="1d4240dd-898f-445f-932d-e2872fd12de3"
                        width={200}
                        height={200}
                        x="50%"
                        y={0}
                        patternUnits="userSpaceOnUse"
                    >
                        <path d="M.5 200V.5H200" fill="none" />
                    </pattern>
                </defs>
                <svg x="50%" y={0} className="overflow-visible fill-gray-800/20">
                    <path
                        d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
                        strokeWidth={0}
                    />
                </svg>
                <rect
                    width="100%"
                    height="100%"
                    strokeWidth={0}
                    fill="url(#1d4240dd-898f-445f-932d-e2872fd12de3)"
                />
            </svg>
            <div
                className="absolute inset-x-0 top-10 -z-10 flex transform-gpu justify-center blur-3xl pt-64"
                aria-hidden="true"
            >
                <div
                    className="complex-animation aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-20"
                    style={{
                        clipPath:
                            "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
                    }}
                />
            </div>
            {children}
        </div>
    )
};


export default SquareBackground;
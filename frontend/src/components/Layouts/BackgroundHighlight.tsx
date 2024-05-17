const BackgroundHighlight = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative isolate sm:pt-40">

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


export default BackgroundHighlight;
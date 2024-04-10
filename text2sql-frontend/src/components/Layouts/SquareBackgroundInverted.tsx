const SquareBackgroundInverted = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="relative isolate px-6 sm:pt-40 lg:px-8">
            <svg
                className="absolute inset-0 -z-10 h-full w-full stroke-white/5 [mask-image:radial-gradient(100%_100%_at_bottom_right,white,transparent)]"
                aria-hidden="true"
            >
                <defs>
                    <pattern
                        id="1d4240dd-898f-445f-932d-e2872fd12d77"

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
                    fill="url(#1d4240dd-898f-445f-932d-e2872fd12d77)"
                />
            </svg>

            {children}
        </div>
    )
};


export default SquareBackgroundInverted;
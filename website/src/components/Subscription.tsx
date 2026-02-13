export default function Subscription() {
    return (
        <section id="plans" className="w-screen flex flex-col items-center gap-10">
            <h2 className="text-4xl font-extrabold text-blue-900 tracking-tight">Subscription Plans</h2>
            <div className="mx-auto flex justify-around gap-8">
                <div className="w-1/4 rounded-3xl text-blue-900 flex flex-col items-center bg-white/90 p-8 shadow-2xl border border-blue-100 hover:scale-[1.02] cursor-pointer transition-all duration-300 ease-linear">
                    <h2 className="text-2xl font-extrabold mb-4 tracking-tight">Small Plan</h2>
                    <ul className="w-4/5 flex flex-col items-center py-5 gap-3">
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                    </ul>
                    <button className="bg-gradient-to-r from-blue-500 to-blue-400 text-lg font-bold px-8 py-3 rounded-xl cursor-pointer text-white hover:bg-blue-600 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow">$9.99/month</button>
                </div>
                <div className="w-1/4 rounded-3xl text-blue-900 flex flex-col items-center bg-white/90 p-8 shadow-2xl border border-blue-100 hover:scale-[1.02] cursor-pointer transition-all duration-300 ease-linear">
                    <h2 className="text-2xl font-extrabold mb-4 tracking-tight">Medium Plan</h2>
                    <ul className="w-4/5 flex flex-col items-center py-5 gap-3">
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                    </ul>
                    <button className="bg-gradient-to-r from-blue-500 to-blue-400 text-lg font-bold px-8 py-3 rounded-xl cursor-pointer text-white hover:bg-blue-600 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow">$29.99/month</button>
                </div>
                <div className="w-1/4 rounded-3xl text-blue-900 flex flex-col items-center bg-white/90 p-8 shadow-2xl border border-blue-100 hover:scale-[1.02] cursor-pointer transition-all duration-300 ease-linear">
                    <h2 className="text-2xl font-extrabold mb-4 tracking-tight">Large Plan</h2>
                    <ul className="w-4/5 flex flex-col items-center py-5 gap-3">
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                        <li className="text-xs font-semibold list-disc">Lorem ipsum dolor sit amet consectetur adipisicing elit. In, quibusdam?</li>
                    </ul>
                    <button className="bg-gradient-to-r from-blue-500 to-blue-400 text-lg font-bold px-8 py-3 rounded-xl cursor-pointer text-white hover:bg-blue-600 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow">$99.99/month</button>
                </div>
            </div>
        </section>
    )
}

import features from "@components/Landing/features.json"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@catalyst/table"
import { CheckCircleIcon } from "@heroicons/react/24/solid";

const FeatureComparisonTable = () => {
    return (
        <div className="flex justify-center">
            <div className="bg-gray-800 w-fit rounded-xl border border-gray-700 overflow-x-scroll sm:overflow-hidden">
                <Table dense bleed grid striped className="[--gutter:theme(spacing.4)] w-fit pl-4 sm:px-4">
                    <TableHead>
                        <TableRow>
                            <TableHeader>Feature</TableHeader>
                            <TableHeader>DataLine</TableHeader>
                            <TableHeader>ChatGPT Plus</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {features.features.map(({ feature, dataline, chatgpt }) => (
                            <TableRow key={feature}>
                                <TableCell className="text-zinc-400">{feature}</TableCell>
                                <TableCell className="text-zinc-400">{
                                    dataline &&
                                    <CheckCircleIcon className="text-emerald-500 w-8 h-8 mx-auto"></CheckCircleIcon>

                                }</TableCell>
                                <TableCell className="text-zinc-400">{
                                    chatgpt &&
                                    <CheckCircleIcon className="text-emerald-500 w-8 h-8 mx-auto"></CheckCircleIcon>

                                }</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

export default FeatureComparisonTable;
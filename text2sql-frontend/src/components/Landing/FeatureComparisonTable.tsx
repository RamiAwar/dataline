import features from "@components/Landing/features.json";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@catalyst/table";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

const FeatureComparisonTable = () => {
  const renderEntry = (input: true | string) => {
    return input === true ? (
      <CheckCircleIcon className="text-emerald-500 w-8 h-8 mx-auto"></CheckCircleIcon>
    ) : (
      input
    );
  };
  return (
    <div className="flex justify-center">
      <div className="bg-gray-800 w-fit rounded-xl border border-gray-700 overflow-x-scroll sm:overflow-hidden">
        <Table
          dense
          bleed
          grid
          striped
          className="[--gutter:theme(spacing.4)] w-fit pl-4 sm:px-4"
        >
          <TableHead>
            <TableRow>
              <TableHeader className="text-center">Feature</TableHeader>
              <TableHeader className="text-center">DataLine</TableHeader>
              <TableHeader className="text-center">ChatGPT Plus</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {features.features.map(({ feature, dataline, chatgpt }) => (
              <TableRow key={feature}>
                <TableCell className="text-zinc-400">{feature}</TableCell>
                <TableCell className="text-zinc-400">
                  {dataline && renderEntry(dataline)}
                </TableCell>
                <TableCell className="text-zinc-400">
                  {chatgpt && renderEntry(chatgpt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default FeatureComparisonTable;

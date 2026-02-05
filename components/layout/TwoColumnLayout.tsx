import { ReactNode } from "react";

interface TwoColumnLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export function TwoColumnLayout({ left, right }: TwoColumnLayoutProps) {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-96 border-r border-gray-200 bg-white overflow-y-auto">
        {left}
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50">{right}</div>
    </div>
  );
}

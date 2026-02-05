import { ApplicationListItem } from "./ApplicationListItem";
import { Application } from "@/lib/types";

interface ApplicationListProps {
  applications: Application[];
  selectedId: string | null;
  onSelect: (app: Application) => void;
}

export function ApplicationList({
  applications,
  selectedId,
  onSelect,
}: ApplicationListProps) {
  return (
    <div className="divide-y divide-gray-100">
      {applications.map((app) => (
        <ApplicationListItem
          key={app.applicationId}
          application={app}
          isSelected={app.applicationId === selectedId}
          onClick={() => onSelect(app)}
        />
      ))}
    </div>
  );
}

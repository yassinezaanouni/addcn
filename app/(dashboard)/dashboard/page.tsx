import { ComponentList } from "./_components/component-list";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Components</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your registry components
        </p>
      </div>
      <ComponentList />
    </div>
  );
}

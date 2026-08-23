import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RoleForm } from "@/components/permissions/RoleForm";
import { RoleList } from "@/components/permissions/RoleList";

export default function PermissionsPage() {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Permissions</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Save reusable roles — a name, a set of categories, and a default duration — so you
          don&apos;t have to pick categories from scratch every time you share.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a role</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleForm />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3.5 font-display text-base font-medium text-[var(--color-text)]">
          Your roles
        </h2>
        <RoleList />
      </div>
    </div>
  );
}

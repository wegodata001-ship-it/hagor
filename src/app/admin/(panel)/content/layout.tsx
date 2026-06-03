import { ContentAdminNav } from "@/components/admin/content-admin-nav";

export default function AdminContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ContentAdminNav />
      {children}
    </div>
  );
}

export default function TenantPage({ params }: { params: { tenantId: string } }) {
  const { tenantId } = params;
  return (
    <main style={{ padding: 24 }}>
      <h1>Tenant: {tenantId}</h1>
      <p>Profile editor coming soon.</p>
    </main>
  );
}

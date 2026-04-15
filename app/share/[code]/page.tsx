import ShareLanding from "./share-landing";

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ShareLanding code={code} />;
}

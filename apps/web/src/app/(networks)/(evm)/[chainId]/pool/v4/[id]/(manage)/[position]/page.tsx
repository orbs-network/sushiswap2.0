import { V4PositionView } from 'src/ui/pool/V4PositionView'

export default async function V3PositionsPage(props: {
  params: Promise<{ chainId: string; id: string; position: string }>
}) {
  const params = await props.params
  return <V4PositionView params={params} />
}

import { useDevice } from "@app/core/stores";

export function ConnectionStatus() {
  const { status } = useDevice();
  console.log(status);

  return <div>Connection Status Component</div>;
}

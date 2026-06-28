interface ConnectionStatusProps {
  connected: boolean
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
      />
      <span className="text-muted-foreground">
        {connected ? "Live" : "Disconnected"}
      </span>
    </div>
  )
}

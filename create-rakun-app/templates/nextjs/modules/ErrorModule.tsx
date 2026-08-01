type ErrorModuleProps = {
  error?: string
}

export default function ErrorModule({ error }: ErrorModuleProps) {
  return (
    <main className="hero">
      <h1>Module validation failed</h1>
      <p>{error ?? 'The module does not match its output schema.'}</p>
    </main>
  )
}

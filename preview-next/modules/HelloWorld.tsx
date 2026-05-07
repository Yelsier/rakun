export default function HelloWorld({ text = "Hello World" }: { text?: string }) {
  return (
    <section className="mx-auto flex min-h-80 max-w-5xl items-center px-6 py-16">
      <h1 className="text-5xl font-semibold tracking-normal text-zinc-950">
        {text}
      </h1>
    </section>
  );
}

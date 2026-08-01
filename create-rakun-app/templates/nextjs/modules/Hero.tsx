type HeroProps = {
  heading: string
  text?: string
}

export default function Hero({ heading, text }: HeroProps) {
  return (
    <main className="hero">
      <h1>{heading}</h1>
      {text ? <p>{text}</p> : null}
    </main>
  )
}

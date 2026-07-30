import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'jsx-email'

export type WelcomeEmailProps = {
  name: string
  activationUrl: string
}

export const previewProps = {
  name: 'Ada',
  activationUrl: 'https://example.com/activate',
} satisfies WelcomeEmailProps

export const Template = ({ name, activationUrl }: WelcomeEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>Welcome to Rakun</Preview>
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Heading style={styles.heading}>Welcome, {name}</Heading>
        <Text style={styles.text}>Your Rakun account is ready. Activate it to get started.</Text>
        <Section style={styles.action}>
          <Button height={44} href={activationUrl} style={styles.button} width={180}>
            Activate account
          </Button>
        </Section>
      </Container>
    </Body>
  </Html>
)

const styles = {
  body: {
    backgroundColor: '#f5f5f4',
    fontFamily: 'Arial, sans-serif',
    padding: '32px 12px',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    margin: '0 auto',
    maxWidth: '560px',
    padding: '32px',
  },
  heading: {
    color: '#1c1917',
    fontSize: '28px',
    margin: '0 0 20px',
  },
  text: {
    color: '#57534e',
    fontSize: '16px',
    lineHeight: '24px',
  },
  action: {
    marginTop: '28px',
  },
  button: {
    backgroundColor: '#1c1917',
    borderRadius: '8px',
    color: '#ffffff',
    display: 'inline-block',
    padding: '12px 20px',
    textDecoration: 'none',
  },
} as const

export default Template

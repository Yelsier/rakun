import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'jsx-email'

export type PasswordResetEmailProps = {
  expiresAt: Date
  resetUrl: string
  user: {
    email: string
    name?: string
  }
}

export const Template = ({
  expiresAt,
  resetUrl,
  user,
}: PasswordResetEmailProps) => (
  <Html lang='en'>
    <Head />
    <Preview>Reset your Rakun manager password</Preview>
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Heading style={styles.heading}>Reset your password</Heading>
        <Text style={styles.text}>Hello {user.name ?? user.email},</Text>
        <Text style={styles.text}>
          This single-use link expires at {expiresAt.toISOString()}.
        </Text>
        <Section style={styles.action}>
          <Button height={44} href={resetUrl} style={styles.button} width={190}>
            Reset password
          </Button>
        </Section>
        <Text style={styles.text}>
          If you did not request this change, you can ignore this email.
        </Text>
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
    margin: '28px 0',
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

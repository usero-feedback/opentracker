import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { AppLoadContext } from 'react-router'
import { contextToBackendConfig } from '~/utils/backendConfig'

let warnedNoCredentials = false

// Null when SES_AWS_* are unset, so email is a logged no-op.
function getSESClient(accessKeyId: string | undefined, secretAccessKey: string | undefined): SESClient | null {
	if (!accessKeyId || !secretAccessKey) {
		if (!warnedNoCredentials) {
			console.log('Email disabled: SES_AWS_ACCESS_KEY_ID / SES_AWS_SECRET_ACCESS_KEY not set')
			warnedNoCredentials = true
		}
		return null
	}
	return new SESClient({ region: 'us-west-2', credentials: { accessKeyId, secretAccessKey } })
}

function logUnsentEmail(emailData: EmailData) {
	console.log('EMAIL WOULD BE SENT (DEV MODE):', {
		to: emailData.to,
		subject: emailData.subject,
		previewText: emailData.previewText,
		htmlLength: emailData.html.length,
	})
}

export interface EmailData {
	to: string
	subject: string
	html: string
	text?: string
	previewText?: string
	replyTo?: string
	fromName?: string
}

export async function sendEmailViaSES(emailData: EmailData, context: AppLoadContext): Promise<boolean> {
	const backendConfig = contextToBackendConfig(context)
	const ses = getSESClient(backendConfig.sesAccessKeyId, backendConfig.sesSecretAccessKey)
	if (!ses) {
		logUnsentEmail(emailData)
		return backendConfig.environment !== 'prod'
	}

	try {
		const fromEmail = backendConfig.emailFrom
		const fromName = emailData.fromName || 'opentracker'

		// Construct email with preview text
		let finalHtml = emailData.html
		if (emailData.previewText) {
			// Add preview text (hidden in most email clients)
			finalHtml = `
				<div style="display: none; max-height: 0; overflow: hidden;">
					${emailData.previewText}
				</div>
				<div style="display: none; max-height: 0; overflow: hidden;">
					&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
				</div>
				${emailData.html}
			`
		}

		const command = new SendEmailCommand({
			Source: `${fromName} <${fromEmail}>`,
			Destination: {
				ToAddresses: [emailData.to],
			},
			Message: {
				Subject: {
					Data: emailData.subject,
					Charset: 'UTF-8',
				},
				Body: {
					Html: {
						Data: finalHtml,
						Charset: 'UTF-8',
					},
					Text: emailData.text
						? {
								Data: emailData.text,
								Charset: 'UTF-8',
							}
						: undefined,
				},
			},
			ReplyToAddresses: emailData.replyTo ? [emailData.replyTo] : undefined,
		})

		const response = await ses.send(command)

		if (response.MessageId) {
			console.log(`Email sent successfully to ${emailData.to}, MessageId: ${response.MessageId}`)
			return true
		} else {
			console.error('Failed to send email - no MessageId returned')
			return false
		}
	} catch (error) {
		console.error(`AWS SES email sending error (subject=${emailData.subject})`, error)

		// In development/preview, log the email instead of failing
		if (backendConfig.environment !== 'prod') {
			logUnsentEmail(emailData)
			return true
		}

		return false
	}
}

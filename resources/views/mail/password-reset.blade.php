<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Reset your password</title>
</head>
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;">
        <h1 style="margin:0 0 12px;font-size:18px;line-height:1.4;">Reset your password</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
            A password reset was requested for your account. Follow the link below to choose a new
            password. The link is valid for {{ $expiresInMinutes }} minutes.
        </p>
        <p style="margin:0 0 16px;">
            <a href="{{ $link }}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#111827;color:#ffffff;font-size:14px;text-decoration:none;">Choose a new password</a>
        </p>
        <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#6b7280;">
            If the button does not work, copy this address into your browser:<br>
            <a href="{{ $link }}" style="color:#2563eb;word-break:break-all;">{{ $link }}</a>
        </p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
            If you did not ask for a new password, you can ignore this message. Nothing has changed
            on your account yet.
        </p>
    </div>
</body>
</html>

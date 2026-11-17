<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Mail delivery test</title>
</head>
<body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;">
        <h1 style="margin:0 0 12px;font-size:18px;line-height:1.4;">Mail delivery works</h1>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">
            This message was sent by the panel to <strong>{{ $recipient }}</strong> to check that the
            mail settings are correct.
        </p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
            Sent at {{ now()->toDateTimeString() }} from {{ config('app.name') }}.
        </p>
    </div>
</body>
</html>

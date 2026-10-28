<!doctype html>
<html lang="zh-Hant">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>活動海報</title>
    <style>
        :root {
            color-scheme: light;
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            min-height: 100%;
        }

        body {
            margin: 0;
            min-height: 100vh;
            padding: clamp(12px, 3vw, 40px);
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            font-family: system-ui, -apple-system, "Segoe UI", "Noto Sans TC", sans-serif;
        }

        .stage {
            width: min(100%, 1400px);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .poster {
            display: block;
            width: auto;
            height: auto;
            max-width: 100%;
            max-height: calc(100vh - 2 * clamp(12px, 3vw, 40px));
            border-radius: 16px;
            background: #ffffff;
            box-shadow:
                0 24px 60px rgba(38, 28, 18, 0.18),
                0 2px 8px rgba(38, 28, 18, 0.08);
        }

        @media (max-width: 600px) {
            body {
                padding: 0;
            }

            .poster {
                max-height: none;
                border-radius: 0;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <main class="stage">
        <img
            class="poster"
            src="/showcase/image"
            alt="261023 活動海報"
            decoding="async"
        >
    </main>
</body>
</html>

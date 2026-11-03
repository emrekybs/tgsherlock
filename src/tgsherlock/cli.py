"""Command line entry point: `tgsherlock`."""
import argparse
import asyncio
import json
import logging
import signal
import sys
import threading
import urllib.request
import webbrowser

from aiohttp import web

from . import __version__, desktop
from .bus import Bus
from .config import Settings
from .server import create_app
from .tg import TG


def _running_instance(port) -> bool:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/ping", timeout=1.5) as resp:
            return json.loads(resp.read().decode()).get("app") == "tgsherlock"
    except Exception:  # noqa: BLE001
        return False


def _open_browser(url):
    threading.Thread(target=webbrowser.open, args=(url,), daemon=True).start()


async def _serve(settings, host, port, open_browser):
    bus = Bus()
    tgm = TG(settings, bus)
    stop = asyncio.Event()
    app = create_app(settings, tgm, bus, stop, desktop.status, local_only=host in ("127.0.0.1", "localhost"))
    runner = web.AppRunner(app, access_log=None, shutdown_timeout=2)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    try:
        await site.start()
    except OSError as exc:
        print(f"Cannot listen on {host}:{port} ({exc.strerror}). Try: tgsherlock --port 8790", file=sys.stderr)
        await runner.cleanup()
        return 1
    url = f"http://{'127.0.0.1' if host in ('0.0.0.0', '::') else host}:{port}/"
    print(f"TGSherlock {__version__} running at {url}  (Ctrl+C to stop)")
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop.set)
        except (NotImplementedError, RuntimeError):
            pass
    asyncio.ensure_future(tgm.start())
    if open_browser:
        _open_browser(url)
    await stop.wait()
    print("Stopping…")
    await tgm.close()
    await runner.cleanup()
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(prog="tgsherlock", description="Telegram OSINT web panel (runs locally).")
    parser.add_argument("--host", default="127.0.0.1", help="interface to bind (default 127.0.0.1)")
    parser.add_argument("--port", type=int, help="port (default 8765 or the one saved in Settings)")
    parser.add_argument("--no-browser", action="store_true", help="do not open the browser")
    parser.add_argument("--install-desktop", action="store_true", help="add TGSherlock to the application menu")
    parser.add_argument("--uninstall-desktop", action="store_true", help="remove the application-menu entry")
    parser.add_argument("--debug", action="store_true", help="verbose logging")
    parser.add_argument("--version", action="version", version=f"tgsherlock {__version__}")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.debug else logging.WARNING,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    if args.uninstall_desktop:
        desktop.uninstall()
        print("Removed the application-menu entry.")
        return
    if args.install_desktop:
        path = desktop.install()
        print(f"Installed menu entry: {path}")
        return

    settings = Settings()
    port = args.port or int(settings["port"])
    open_browser = not args.no_browser and settings["prefs"].get("browser", True)

    if _running_instance(port):
        url = f"http://127.0.0.1:{port}/"
        print(f"TGSherlock is already running at {url}")
        if not args.no_browser:
            webbrowser.open(url)
        return

    if desktop.supported() and not settings["desktop_installed"]:
        try:
            desktop.install()
            settings.set("desktop_installed", True)
        except OSError:
            pass

    if args.host not in ("127.0.0.1", "localhost"):
        print("Warning: the panel has no password. Only bind to other interfaces on trusted networks.",
              file=sys.stderr)
    try:
        code = asyncio.run(_serve(settings, args.host, port, open_browser))
    except KeyboardInterrupt:
        code = 0
    sys.exit(code)


if __name__ == "__main__":
    main()

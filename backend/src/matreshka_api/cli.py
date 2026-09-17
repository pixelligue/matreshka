"""Operator CLI. Users are created here, not over HTTP."""

from __future__ import annotations

import argparse
import getpass
import sys

from pathlib import Path

from matreshka_api.auth import UserAlreadyExistsError, provision_user
from matreshka_api.updates import publish_desktop


def _read_password(provided: str | None) -> str:
    if provided:
        return provided
    password = getpass.getpass("Password: ")
    if not password:
        sys.stderr.write("Password is required\n")
        raise SystemExit(1)
    return password


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="matreshka-api")
    subparsers = parser.add_subparsers(dest="command", required=True)
    create_user = subparsers.add_parser(
        "create-user",
        help="Create an operator user (email + password)",
    )
    create_user.add_argument("--email", required=True)
    create_user.add_argument(
        "--password",
        default=None,
        help="Password; omit to type it without echoing (preferred)",
    )
    publish = subparsers.add_parser(
        "publish-desktop",
        help="Copy a packaged Desktop target into UPDATE_ARTIFACT_ROOT",
    )
    publish.add_argument("--target", required=True)
    publish.add_argument(
        "--from",
        dest="source",
        required=True,
        help="Directory containing channel YAML and named artifacts",
    )
    args = parser.parse_args(argv)

    if args.command == "create-user":
        password = _read_password(args.password)
        try:
            user = provision_user(args.email, password)
        except UserAlreadyExistsError as exc:
            sys.stderr.write(f"{exc}\n")
            raise SystemExit(1) from exc
        sys.stdout.write(f"Created user {user.email}\n")
        return
    if args.command == "publish-desktop":
        publish_desktop(args.target, Path(args.source))
        sys.stdout.write(f"Published {args.target}\n")

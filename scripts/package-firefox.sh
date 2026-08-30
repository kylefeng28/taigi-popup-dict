NAME='taigi'
VERSION=$(cat manifest.json | jq -r '.version')
ARTIFACT_NAME="$NAME-$VERSION-firefox.zip"
web-ext build -s dist -a . -n "$ARTIFACT_NAME" --overwrite-dest

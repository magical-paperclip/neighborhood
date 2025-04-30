# Neighborhood Desktop App

A simple Electron wrapper for the Hack Club Neighborhood website.

## Overview

This app simply loads the Hack Club Neighborhood website (https://neighborhood.hackclub.dev/desktop) in an Electron window, providing a desktop experience for the website.

## Development

1. Install dependencies:
```
npm install
```

2. Run the app:
```
npm start
```

## Packaging

To create a distributable package:
```
npm run package
```

This will create a package in the `out` directory.

For platform-specific installers:
```
npm run make
```

## Size Optimization

The app is optimized for minimal size through:
- Production-only dependencies with `--production` flag
- ASAR packaging compression
- Pruning of development files
- Ignoring unnecessary directories and files
- Optimized memory usage in the Electron window

## License

This project is licensed under the terms of the MIT license.

# Invoice Maker - React Application

A modern React-based invoice management application with ARES (Czech Business Registry) integration and QR code generation for SEPA payments.

## Features

- ✨ Create and manage invoices
- 🔍 Search Czech companies via ARES API
- 📱 Generate EPC QR codes for SEPA payments
- 💾 Local storage persistence
- 🌙 Dark mode support
- 📊 Filter and search invoices
- 📁 Export invoices to JSON

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd invoice-react
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### ARES Integration

For ARES (Czech Business Registry) integration to work, you need to run the proxy server:

1. Navigate to the parent directory
2. Run the Node.js server:
```bash
node server.js
```

The Vite dev server will automatically proxy `/api` requests to `http://localhost:5500`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Docker Deployment

Build the Docker image:
```bash
docker build -t invoice-react .
```

Run the container:
```bash
docker run -p 5173:5173 invoice-react
```

## Project Structure

```
invoice-react/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── InvoiceForm.jsx
│   │   ├── InvoiceList.jsx
│   │   ├── QRPreview.jsx
│   │   ├── AresSearch.jsx
│   │   └── ItemsTable.jsx
│   ├── utils/
│   │   └── storage.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

## Technologies Used

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **qrcode.react** - QR code generation
- **LocalStorage** - Data persistence

## License

MIT

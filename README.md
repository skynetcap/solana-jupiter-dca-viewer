# Solana Jupiter DCA Order Viewer

This project is a one-page website for viewing Solana's Jupiter DCA (Dollar-Cost Averaging) orders. It provides a user interface to view, sort, and filter DCA orders, along with a chart visualization of order sizes over time.

## Features

- Dark theme with modern styling
- Filtering by input mint, output mint, and user
- Sorting of orders by various fields
- Chart visualization of order amounts over time
- Virtu alized list for efficient rendering of large datasets

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- Bun (optional, but recommended for faster package management and running)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/solana-jupiter-dca-viewer.git
   cd solana-jupiter-dca-viewer
   ```

2. Install dependencies:
   
   If using Bun:
   ```
   bun install
   ```

   If using npm:
   ```
   npm install
   ```

### Running the Application

To start the development server:

If using Bun:
```
bun start
```

If using npm:
```
npm start
```

The application will be available at `http://localhost:3000`.

## Building for Production

To create a production build:

If using Bun:
```
bun run build
```

If using npm:
```
npm run build
```

This will create a `build` folder with the production-ready files.

## Technologies Used

- React
- TypeScript
- Chart.js
- react-window for virtualization
- Tailwind CSS for styling

## License

This project is open source and available under the [MIT License](LICENSE).
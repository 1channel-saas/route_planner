# Field Team Journey Planner

A smart route optimization application that helps field teams plan their daily journeys efficiently, considering realistic travel time constraints and working hours.

## Features

- **Smart Route Optimization**: Uses nearest neighbor algorithm with time constraints
- **Excel-based Input**: Easy data upload via Excel files
- **Travel Time Calculations**: Considers realistic road distances and average speeds
- **Working Hours Compliance**: Ensures routes fit within employee working hours
- **Multi-user Support**: Handles multiple field team members with different schedules
- **Automatic Column Detection**: Flexible Excel format recognition
- **Visit Frequency Management**: Handles outlets requiring multiple visits per month
- **Shortfall Reporting**: Identifies outlets that couldn't be scheduled due to time constraints
- **Route Visualization**: View optimized routes on Google Maps with turn-by-turn directions
- **Interactive Map**: Select user and day to see exact route with visit order

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (optional, for development server)
- Excel file with outlet and user data

## Installation

1. Clone or download the repository to your local machine
2. Navigate to the project directory:
   ```bash
   cd C:\Users\sayantan\my-claude-project\route-planner
   ```

### Option 1: Direct Browser Access
Simply open `public/index.html` in your web browser.

### Option 2: Using Development Server
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. The application will open automatically in your default browser at `http://localhost:8080`

## Excel File Format

Your Excel file must contain two sheets:

### Sheet 1: "Outlets"
Required columns (flexible naming):
- **Outlet Code**: Unique identifier for each outlet
- **Latitude**: Decimal degrees (e.g., 28.6139)
- **Longitude**: Decimal degrees (e.g., 77.2090)
- **Visit Frequency**: Number of visits required per month (1-30)

### Sheet 2: "Users"
Required columns (flexible naming):
- **User Name**: Field team member name
- **Start Location**: Starting coordinates (e.g., "28.6139 77.2090")
- **End Location**: Ending coordinates (e.g., "28.6139 77.2090")
- **Week Off Day**: Day of the week (e.g., "Sunday")

## Usage

1. Open the application in your browser
2. Upload your Excel file using the file picker
3. Adjust parameters:
   - **Average time per outlet**: Time spent at each location (default: 60 minutes)
   - **Average travel speed**: Expected speed considering traffic (default: 25 km/hr)
4. Click "Generate Realistic Journey Plan"
5. The optimized journey plan will be downloaded automatically
6. Click "View Routes on Map" to visualize the routes

## Route Visualization

After generating a journey plan:
1. Click the "View Routes on Map" link in the success message
2. Select a user from the dropdown
3. Select a day from the dropdown
4. Click "Show Route on Map" to see the optimized route
5. The map will display:
   - Green marker: Start location
   - Blue markers: Outlets to visit (numbered in order)
   - Red marker: End location
   - Blue route line: Driving directions

## Google Maps API Setup

To use the route visualization feature, you'll need a Google Maps API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - **Maps JavaScript API** (required - includes the Directions service)
   - **Geocoding API** (required for showing addresses)
   - **Places API** (optional, for enhanced location services)
4. Create credentials (API Key)
5. Restrict the API key to your domain (recommended for security)
6. Enter the API key when prompted in the application

Note: The Directions service is now included within the Maps JavaScript API, so you don't need to enable it separately.

## Output

The application generates an Excel file containing:

### Journey Plan Sheet
- **User Code**: Field team member assigned
- **Day**: Week and day of visit (e.g., "1st Monday")
- **Order**: Visit sequence for the day
- **Outlet Code**: Outlet to visit

### Visit Shortfall Sheet (if applicable)
- **Outlet Code**: Outlets that couldn't be fully scheduled
- **Visit Shortfall**: Number of visits that couldn't be accommodated

## Configuration

Key parameters can be modified in `src/js/journey-planner.js`:

```javascript
// Working hours (24-hour format)
this.workingHours = { start: 9.5, end: 19.5 }; // 9:30 AM to 7:30 PM

// Outlet operating hours
this.outletHours = { start: 10, end: 19 }; // 10 AM to 7 PM

// Road distance multiplier
this.roadDistanceFactor = 1.3; // Linear distance × 1.3 ≈ road distance
```

## Deployment

### Static Hosting
The application is purely client-side and can be deployed to any static hosting service:

1. **GitHub Pages**: Push to a GitHub repository and enable Pages
2. **Netlify**: Drag and drop the project folder
3. **Vercel**: Deploy with one click
4. **AWS S3**: Upload to S3 bucket with static website hosting

### Server Deployment
For server deployment (Apache, Nginx):
1. Copy the entire project folder to your web server
2. Ensure the `public` directory is accessible
3. No server-side configuration required

## Browser Compatibility

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Troubleshooting

### "Required sheets not found" error
- Ensure your Excel file has sheets named exactly "Outlets" and "Users"

### "Invalid location format" error
- Check that location coordinates are in "latitude longitude" format with a space

### Routes not fitting in day
- Try reducing average time per outlet
- Increase average travel speed if realistic
- Check if outlets are too far from user locations

## License

MIT License - feel free to use and modify for your needs.

## Support

For issues or questions, please create an issue in the project repository.# Deployed on Vercel

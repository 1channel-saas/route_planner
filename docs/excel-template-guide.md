# Excel Template Guide

## Sample Data Structure

### Outlets Sheet

| Outlet Code | Latitude | Longitude | Visit frequency |
|-------------|----------|-----------|-----------------|
| OUT001      | 28.6139  | 77.2090   | 4              |
| OUT002      | 28.6289  | 77.2065   | 2              |
| OUT003      | 28.5355  | 77.3910   | 3              |
| OUT004      | 28.4595  | 77.0266   | 1              |

### Users Sheet

| User Name | Start Location | End Location | Week Off Day |
|-----------|----------------|--------------|--------------|
| John Doe  | 28.6139 77.2090| 28.6139 77.2090| Sunday     |
| Jane Smith| 28.5355 77.3910| 28.5355 77.3910| Saturday   |
| Bob Wilson| 28.4595 77.0266| 28.4595 77.0266| Sunday     |

## Column Variations Supported

The application automatically detects these column name variations:

### Outlet Code
- Outlet Code
- outlet code
- OutletCode
- Outlet_Code
- outlet_code
- Outley Code (typo variation)

### Latitude
- Latitude
- latitude
- Lattitude (typo variation)
- Lat
- lat

### Longitude
- Longitude
- longitude
- Lng
- lng
- Long
- long

### Visit Frequency
- Visit frequency
- visit frequency
- VisitFrequency
- Visit_frequency
- Frequency
- frequency

### User Name
- User Name
- user name
- UserName
- User_Name
- Name
- name

### Location Fields
- Start Location / start location
- End Location / end location
- StartLocation / EndLocation
- Start_Location / End_Location

### Week Off Day
- Week Off Day
- week off day
- WeekOffDay
- Week_Off_Day
- OffDay
- off day
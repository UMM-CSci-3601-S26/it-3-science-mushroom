import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FormatDateTimeService {

  /**
   * Formats a date into two string representations.
   * The first (0): The formatted date string in format MM-DD-YYYY HH:MM(AM/PM) for display inside files
   * The second (1): The formatted date string in format MM-DD-YYYY_HH_MM(AM/PM) for use in the file names
   */
  formatDateTime(date: Date): string[] {
    let minute = date.getMinutes().toString();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1; // Months are zero-indexed
    const year = date.getFullYear();
    const formattedStrings: string[] = [];

    if (minute.length < 2) {
      // Add leading zero to minutes if less than 10 for better formatting
      minute = `0${minute}`;
    }
    // Format the date and time as MM-DD-YYYY_HH:MM(AM/PM)
    if (hour > 12) { // PM hours
      formattedStrings.push(`${month}-${day}-${year} ${hour-12}:${minute} PM`); // Format for inside file
      formattedStrings.push(`${month}-${day}-${year}_${hour-12}-${minute}_PM`); // Format for file name
      return formattedStrings;
    } else if (hour < 12 && hour > 0) { // AM hours
      formattedStrings.push(`${month}-${day}-${year} ${hour}:${minute} AM`); // Format for inside file
      formattedStrings.push(`${month}-${day}-${year}_${hour}-${minute}_AM`); // Format for file name
      return formattedStrings;
    } else if (hour === 12) { // Noon
      formattedStrings.push(`${month}-${day}-${year} ${hour}:${minute} PM`); // Format for inside file
      formattedStrings.push(`${month}-${day}-${year}_${hour}-${minute}_PM`); // Format for file name
      return formattedStrings;
    } else { // Midnight
      formattedStrings.push(`${month}-${day}-${year} 12:${minute} AM`); // Format for inside file
      formattedStrings.push(`${month}-${day}-${year}_12-${minute}_AM`); // Format for file name
      return formattedStrings;
    }
  }
}

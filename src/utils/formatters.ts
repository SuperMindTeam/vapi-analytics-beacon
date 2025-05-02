
import { format, formatDistanceToNow } from "date-fns";

// Format a date to a readable string
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy h:mm a");
  } catch (error) {
    return "Invalid date";
  }
};

// Format a date as relative time (e.g., "2 hours ago")
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return "Unknown time";
  }
};

// Format seconds to minutes:seconds
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "0:00";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

// Format phone numbers to (123) 456-7890 format
export const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return "";
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "");
  
  // Check if the number has the expected length for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === "1") {
    // Handle numbers with country code
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phoneNumber;
};

// Format numbers to include commas for thousands
export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat().format(number);
};

// Capitalize first letter
export const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

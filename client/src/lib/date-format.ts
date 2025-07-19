// Format live recording date from datetime-local to Japanese readable format
export function formatLiveRecordingDate(dateTimeString: string): string {
  if (!dateTimeString) return 'TBD';
  
  try {
    const date = new Date(dateTimeString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return 'TBD';
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Format: "2025年7月20日 20:00"
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    return `${year}年${month}月${day}日 ${formattedTime}`;
  } catch (error) {
    return 'TBD';
  }
}

// Convert datetime-local string to readable Japanese format for editing
export function formatDateTimeForInput(dateTimeString: string): string {
  if (!dateTimeString) return '';
  
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return '';
    
    // Format for datetime-local input: "2025-07-20T20:00"
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    return '';
  }
}
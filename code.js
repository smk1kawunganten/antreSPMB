// Spreadsheet ID where data will be stored
const SPREADSHEET_ID = '197fysA7owVTVCLW-hXIyGHcmu02cet6xwy3QyCdC9pA';
const SHEET_NAME = 'Pendaftar';

// Initialize spreadsheet and sheet
function initializeSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange('A1:I1').setValues([['Timestamp', 'NISN', 'NoTelp', 'NIK', 'Nama', 'Lulusan', 'Tanggal', 'Nomor Antrian', 'Jam Datang']]);
  }
  
  return sheet;
}

function doPost(e) {
  try {
    const sheet = initializeSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Validate date is weekday
    const date = new Date(data.Tanggal);
    if (date.getDay() === 0 || date.getDay() === 6) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Pilih hari Senin-Jumat'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if NISN already registered for this date
    const registrations = sheet.getDataRange().getValues();
    const existingRegistration = registrations.find(row => 
      row[1] === data.NISN && 
      new Date(row[6]).toDateString() === new Date(data.Tanggal).toDateString()
    );
    
    if (existingRegistration) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'NISN sudah terdaftar pada tanggal ini. Silakan pilih tanggal lain.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Count registrations for this date
    const registrationsForDate = registrations.filter(row =>
      new Date(row[6]).toDateString() === new Date(data.Tanggal).toDateString()
    );
    
    if (registrationsForDate.length >= 250) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: 'Kuota tanggal ini sudah penuh. Silakan pilih tanggal lain.'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Calculate queue number and arrival time
    const queueNumber = registrationsForDate.length + 1;
    const baseTime = new Date(data.Tanggal);
    baseTime.setHours(8, 0, 0); // Start at 8 AM
    
    // Every 20 minutes can serve 15 students
    const timeSlot = Math.floor((queueNumber - 1) / 15);
    const arrivalTime = new Date(baseTime.getTime() + timeSlot * 20 * 60000);
    
    // Insert data
    sheet.appendRow([
      new Date(), // Timestamp
      data.NISN,
      data.NoTelp,
      data.NIK,
      data.Nama,
      data.Lulusan,
      data.Tanggal,
      queueNumber,
      arrivalTime.toLocaleTimeString('id-ID')
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: `Pendaftaran berhasil! Nomor antrian Anda: ${queueNumber}. Jam kedatangan: ${arrivalTime.toLocaleTimeString('id-ID')}`
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Terjadi kesalahan: ' + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from './cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register fonts (you can add more fonts)
try {
  registerFont(path.join(__dirname, '../../fonts/Arial.ttf'), { family: 'Arial' });
  registerFont(path.join(__dirname, '../../fonts/Roboto-Regular.ttf'), { family: 'Roboto' });
} catch (error) {
  console.log('Font registration failed, using default fonts');
}

export class ResultCardGenerator {
  constructor(template, result, student) {
    this.template = template;
    this.result = result;
    this.student = student;
    this.canvas = null;
    this.ctx = null;
  }

  async generate() {
    const { design } = this.template;
    
    // Create canvas
    this.canvas = createCanvas(design.width, design.height);
    this.ctx = this.canvas.getContext('2d');
    
    // Draw background
    await this.drawBackground();
    
    // Draw logo
    if (design.logo.enabled && design.logo.url) {
      await this.drawLogo();
    }
    
    // Draw title
    if (design.title.enabled !== false) {
      this.drawText(design.title);
    }
    
    // Draw student photo
    if (design.student_photo.enabled && this.result.student_photo_url) {
      await this.drawStudentPhoto();
    }
    
    // Draw student info
    this.drawStudentInfo();
    
    // Draw marks table
    if (design.marks_table.enabled) {
      this.drawMarksTable();
    }
    
    // Draw totals
    this.drawTotals();
    
    // Draw date
    if (design.date.enabled !== false) {
      this.drawDate();
    }
    
    return this.canvas.toBuffer();
  }

  async drawBackground() {
    const { background } = this.template.design;
    
    if (background.type === 'image' && background.image_url) {
      try {
        const bgImage = await loadImage(background.image_url);
        this.ctx.drawImage(bgImage, 0, 0, this.canvas.width, this.canvas.height);
      } catch (error) {
        console.log('Background image failed, using color');
        this.ctx.fillStyle = background.color || '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    } else {
      this.ctx.fillStyle = background.color || '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  async drawLogo() {
    const { logo } = this.template.design;
    try {
      const logoImage = await loadImage(logo.url);
      const pos = logo.position;
      this.ctx.drawImage(logoImage, pos.x, pos.y, pos.width, pos.height);
    } catch (error) {
      console.log('Logo drawing failed:', error.message);
    }
  }

  drawText(config) {
    const { text, font, size, color, position } = config;
    if (!text || !position) return;
    
    this.ctx.font = `${size}px ${font}`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(text, position.x, position.y + size); // Add size to y for proper baseline
  }

  async drawStudentPhoto() {
    const { student_photo } = this.template.design;
    try {
      const photoImage = await loadImage(this.result.student_photo_url);
      const pos = student_photo.position;
      
      // Draw border
      if (student_photo.border_width > 0) {
        this.ctx.strokeStyle = student_photo.border;
        this.ctx.lineWidth = student_photo.border_width;
        this.ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
      }
      
      // Draw photo
      this.ctx.drawImage(photoImage, pos.x, pos.y, pos.width, pos.height);
    } catch (error) {
      console.log('Student photo drawing failed:', error.message);
    }
  }

  drawStudentInfo() {
    const { student_info } = this.template.design;
    
    // Draw name
    if (student_info.name.enabled !== false) {
      const nameConfig = {
        ...student_info.name,
        text: this.student.name
      };
      this.drawText(nameConfig);
    }
    
    // Draw roll number
    if (student_info.roll_no.enabled !== false) {
      const rollConfig = {
        ...student_info.roll_no,
        text: this.student.custom_id || this.student.id
      };
      this.drawText(rollConfig);
    }
    
    // Draw standard
    if (student_info.standard.enabled !== false) {
      const stdConfig = {
        ...student_info.standard,
        text: this.student.standard
      };
      this.drawText(stdConfig);
    }
  }

  drawMarksTable() {
    const { marks_table } = this.template.design;
    const pos = marks_table.position;
    
    // Table dimensions
    const colWidth = pos.width / 4; // Subject, Max, Obtained, Percentage
    const rowHeight = 30;
    const headerHeight = 40;
    
    // Draw header
    this.ctx.fillStyle = marks_table.header.background;
    this.ctx.fillRect(pos.x, pos.y, pos.width, headerHeight);
    
    this.ctx.font = `${marks_table.header.size}px ${marks_table.header.font}`;
    this.ctx.fillStyle = marks_table.header.color;
    this.ctx.textAlign = 'center';
    
    const headers = ['Subject', 'Max Marks', 'Obtained', 'Percentage'];
    headers.forEach((header, index) => {
      const x = pos.x + (index * colWidth) + (colWidth / 2);
      const y = pos.y + (headerHeight / 2) + 5;
      this.ctx.fillText(header, x, y);
    });
    
    // Draw data rows
    this.ctx.font = `${marks_table.data.size}px ${marks_table.data.font}`;
    this.ctx.fillStyle = marks_table.data.color;
    
    this.result.subjects.forEach((subject, index) => {
      const y = pos.y + headerHeight + (index * rowHeight) + (rowHeight / 2) + 5;
      
      // Alternate row colors
      if (index % 2 === 0) {
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(pos.x, pos.y + headerHeight + (index * rowHeight), pos.width, rowHeight);
        this.ctx.fillStyle = marks_table.data.color;
      }
      
      // Subject name
      this.ctx.textAlign = 'left';
      this.ctx.fillText(subject.name, pos.x + 10, y);
      
      // Max marks
      this.ctx.textAlign = 'center';
      this.ctx.fillText(subject.max_marks.toString(), pos.x + colWidth + (colWidth / 2), y);
      
      // Obtained marks
      this.ctx.fillText(subject.obtained_marks.toString(), pos.x + (2 * colWidth) + (colWidth / 2), y);
      
      // Percentage
      this.ctx.fillText(`${subject.percentage}%`, pos.x + (3 * colWidth) + (colWidth / 2), y);
    });
  }

  drawTotals() {
    const { total_marks, percentage, grade } = this.template.design;
    
    // Draw total marks
    if (total_marks.enabled !== false) {
      const totalConfig = {
        ...total_marks,
        text: `Total: ${this.result.total_obtained_marks}/${this.result.total_max_marks}`
      };
      this.drawText(totalConfig);
    }
    
    // Draw percentage
    if (percentage.enabled !== false) {
      const percentConfig = {
        ...percentage,
        text: `Percentage: ${this.result.total_percentage}%`
      };
      this.drawText(percentConfig);
    }
    
    // Draw grade
    if (grade.enabled !== false) {
      const gradeConfig = {
        ...grade,
        text: `Grade: ${this.result.overall_grade}`
      };
      this.drawText(gradeConfig);
    }
  }

  drawDate() {
    const { date } = this.template.design;
    const dateConfig = {
      ...date,
      text: `Generated on: ${new Date().toLocaleDateString()}`
    };
    this.drawText(dateConfig);
  }
}

export async function generateResultCard(template, result, student) {
  const generator = new ResultCardGenerator(template, result, student);
  const buffer = await generator.generate();
  
  // Upload to Cloudinary
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'result-cards',
        public_id: `result_${result.id}`,
        format: 'png'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    
    stream.end(buffer);
  });
}

export async function generatePDFResultCard(template, result, student) {
  // For PDF generation, we'll use html2canvas approach
  // This is a simplified version - you might want to use a proper PDF library
  const generator = new ResultCardGenerator(template, result, student);
  const buffer = await generator.generate();
  
  // Convert to PDF (simplified - you might want to use jsPDF)
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'result-cards',
        public_id: `result_${result.id}_pdf`,
        format: 'pdf'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    
    stream.end(buffer);
  });
} 
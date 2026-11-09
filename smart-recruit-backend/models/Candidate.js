const db = require('../config/database');

class Candidate {
  static async create(candidateData) {
    const {
      fullname,
      email,
      phoneNumber,
      jobTitle,
      department,
      location,
      gpa,
      experience,
      skills,
      coverletter,
      resumePath,
      externalLink,
    } = candidateData;

    const query = `
      INSERT INTO candidates (
        fullname, email, phone_number, job_title, department,
        location, gpa, experience, skills, coverletter,
        resume_path, external_link
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      fullname,
      email,
      phoneNumber,
      jobTitle,
      department,
      location,
      gpa,
      experience,
      skills,
      coverletter,
      resumePath,
      externalLink,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM candidates WHERE 1 = 1';
    const values = [];
    let valueIndex = 1;

    if (filters.department) {
      query += ` AND department = $${valueIndex}`;
      values.push(filters.department);
      valueIndex++;
    }

    if (filters.location) {
      query += ` AND location = $${valueIndex}`;
      values.push(filters.location);
      valueIndex++;
    }

    if (filters.status) {
      query += ` AND status = $${valueIndex}`;
      values.push(filters.status);
      valueIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, values);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM candidates WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async updateStatus(id, status, scheduledDateTime = null) {
    const query = `
      UPDATE candidates
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM candidates WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getStatusHistory(id) {
    const query = `
      SELECT * FROM candidate_status_history
      WHERE id = $1
      ORDER BY status_changed_at DESC
    `;
    const result = await db.query(query, [id]);
    return result.rows;
  }
}

module.exports = Candidate;

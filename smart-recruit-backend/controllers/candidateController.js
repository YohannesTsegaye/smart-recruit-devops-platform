const Candidate = require('../models/Candidate');
const emailService = require('../services/emailService');

exports.updateCandidateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, scheduledDateTime } = req.body;

    // Update candidate status
    const candidate = await Candidate.updateStatus(
      id,
      status,
      scheduledDateTime,
    );
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Send email notification
    try {
      await emailService.sendStatusUpdateEmail(
        candidate,
        status,
        scheduledDateTime,
      );
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
      // Don't fail the request if email fails, but inform the client
      return res.status(200).json({
        candidate,
        emailStatus: 'failed',
        message: 'Status updated but failed to send email notification',
      });
    }

    res.status(200).json({
      candidate,
      emailStatus: 'sent',
      message: 'Status updated and notification email sent',
    });
  } catch (error) {
    console.error('Error updating candidate status:', error);
    res.status(500).json({
      message: 'Error updating candidate status',
      error: error.message,
    });
  }
};

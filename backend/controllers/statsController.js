const Complaint = require('../models/Complaint');
const User = require('../models/User');

// @desc    Get total complaints count
// @route   GET /api/stats/total
// @access  Private/Admin
exports.getTotalComplaints = async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    res.status(200).json({
      success: true,
      data: { total },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get pending complaints count
// @route   GET /api/stats/pending
// @access  Private/Admin
exports.getPendingComplaints = async (req, res) => {
  try {
    const pending = await Complaint.countDocuments({ status: 'Pending' });
    res.status(200).json({
      success: true,
      data: { pending },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get resolved complaints count
// @route   GET /api/stats/resolved
// @access  Private/Admin
exports.getResolvedComplaints = async (req, res) => {
  try {
    const resolved = await Complaint.countDocuments({ status: 'Resolved' });
    res.status(200).json({
      success: true,
      data: { resolved },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get category distribution
// @route   GET /api/stats/category-distribution
// @access  Private/Admin
exports.getCategoryDistribution = async (req, res) => {
  try {
    const distribution = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Format for Chart.js
    const labels = distribution.map(item => item._id);
    const data = distribution.map(item => item.count);

    res.status(200).json({
      success: true,
      data: {
        labels,
        datasets: [{
          label: 'Complaints',
          data,
        }],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get status distribution
// @route   GET /api/stats/status-distribution
// @access  Private/Admin
exports.getStatusDistribution = async (req, res) => {
  try {
    const distribution = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Format for Chart.js doughnut chart
    const labels = distribution.map(item => item._id);
    const data = distribution.map(item => item.count);

    res.status(200).json({
      success: true,
      data: {
        labels,
        datasets: [{
          data,
        }],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get all statistics at once
// @route   GET /api/stats/all
// @access  Private/Admin
exports.getAllStats = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      total,
      pending,
      resolved,
      resolvedThisMonth,
      verifiedIssues,
      categoryDist,
      statusDist,
      responseTrend,
      activeZones,
      leaderboard,
    ] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: 'Pending' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ status: 'Resolved', updatedAt: { $gte: startOfMonth } }),
      Complaint.countDocuments({ verifiedAt: { $exists: true, $ne: null } }),
      Complaint.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Complaint.aggregate([
        {
          $match: {
            status: 'Resolved',
            updatedAt: { $exists: true },
          },
        },
        {
          $project: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
            hours: {
              $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60],
            },
          },
        },
        {
          $group: {
            _id: '$day',
            avgHours: { $avg: '$hours' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 14 },
      ]),
      Complaint.aggregate([
        {
          $match: {
            location: { $exists: true, $ne: '' },
          },
        },
        {
          $group: {
            _id: '$location',
            count: { $sum: 1 },
            open: {
              $sum: {
                $cond: [{ $ne: ['$status', 'Resolved'] }, 1, 0],
              },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      User.find({})
        .select('name email reputation')
        .sort({ 'reputation.points': -1 })
        .limit(10)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        resolved,
        resolvedThisMonth,
        verifiedIssues,
        communityImpactScore: Math.round((resolved * 12) + (verifiedIssues * 8) + (total * 2)),
        categoryDistribution: {
          labels: categoryDist.map(item => item._id),
          data: categoryDist.map(item => item.count),
        },
        statusDistribution: {
          labels: statusDist.map(item => item._id),
          data: statusDist.map(item => item.count),
        },
        responseTimeTrend: responseTrend.map((item) => ({
          day: item._id,
          avgHours: Math.round(item.avgHours * 10) / 10,
          count: item.count,
        })),
        activeZones: activeZones.map((item) => ({
          location: item._id,
          count: item.count,
          open: item.open,
        })),
        leaderboard: leaderboard.map((user, index) => ({
          rank: index + 1,
          name: user.name,
          email: user.email,
          points: user.reputation?.points || 0,
          reportsSubmitted: user.reputation?.reportsSubmitted || 0,
          verificationsGiven: user.reputation?.verificationsGiven || 0,
          badges: user.reputation?.badges || [],
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};



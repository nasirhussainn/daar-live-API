const Subscription = require('../../models/Subscription');
const Realtor = require('../../models/Realtor');

// 📌 Controller to subscribe a realtor
const subscribeRealtor = async (req, res) => {
  try {
    const { realtor_id, customer_id, plan_name, start_date, end_date } = req.body;

    // Check if the realtor exists
    const realtor = await Realtor.findById(realtor_id);
    if (!realtor) {
      return res.status(404).json({ message: 'Realtor not found' });
    }

    // Check if realtor already has an active subscription
    const existingSubscription = await Subscription.findOne({
      realtor_id,
      status: 'active',
    });

    if (existingSubscription) {
      existingSubscription.status = 'changed';
      await existingSubscription.save();
    }

    // Create a new subscription
    const subscription = new Subscription({
      realtor_id,
      customer_id,
      plan_name,
      start_date,
      end_date,
      status: 'active',
    });

    // Save subscription
    await subscription.save();

    // Ensure realtor's is_subscribed is set to true
    await Realtor.findByIdAndUpdate(realtor_id, { is_subscribed: true });

    return res.status(201).json({
      message: 'Subscription successfully created',
      previous_subscription_status: existingSubscription ? 'changed' : 'none',
      new_subscription: subscription,
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// 📌 Controller to get all active subscriptions
const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ status: 'active' })
      .populate('realtor_id', 'business_name');

    res.status(200).json(subscriptions);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// 📌 Controller to get active subscriptions for a specific realtor
const getRealtorSubscriptions = async (req, res) => {
    try {
      const { realtor_id } = req.params;
  
      // Find subscriptions and populate both the realtor and user details
      const subscriptions = await Subscription.find({ realtor_id, status: 'active' })
        .populate({
          path: 'realtor_id',
          select: 'business_name is_subscribed user_id',  // Select the fields you need from Realtor
          populate: {
            path: 'user_id',
            select: 'full_name email',  // Select the fields you need from User
          },
        });
  
      if (!subscriptions.length) {
        return res.status(404).json({ message: 'No active subscriptions found for this realtor' });
      }
  
      res.status(200).json(subscriptions);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };
  

// 📌 Controller to cancel a subscription
const cancelSubscription = async (req, res) => {
  try {
    const { subscription_id } = req.params;

    // Find the subscription
    const subscription = await Subscription.findById(subscription_id);
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Update the status to 'inactive'
    subscription.status = 'inactive';
    await subscription.save();

    // Check if the realtor has any other active subscriptions
    const activeSubscriptions = await Subscription.findOne({
      realtor_id: subscription.realtor_id,
      status: 'active',
    });

    // If no active subscriptions remain, update is_subscribed to false
    if (!activeSubscriptions) {
      await Realtor.findByIdAndUpdate(subscription.realtor_id, { is_subscribed: false });
    }

    res.status(200).json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  subscribeRealtor,
  getAllSubscriptions,
  getRealtorSubscriptions,
  cancelSubscription,
};

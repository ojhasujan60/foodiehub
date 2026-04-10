const Food = require('../models/Food');
const fs = require('fs');
const path = require('path');

// Get all food items with filters
exports.getMenu = async (req, res) => {
  try {
    const { category, cuisine, isVegetarian, search, minPrice, maxPrice, sort } = req.query;
    
    let filter = { isAvailable: true };
    
    if (category) filter.category = category;
    if (cuisine) filter.cuisine = cuisine;
    if (isVegetarian === 'true') filter.isVegetarian = true;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    let sortOption = {};
    if (sort === 'price_asc') sortOption.price = 1;
    else if (sort === 'price_desc') sortOption.price = -1;
    else if (sort === 'rating') sortOption.averageRating = -1;
    else if (sort === 'popular') sortOption.isPopular = -1;
    else sortOption.createdAt = -1;
    
    const foods = await Food.find(filter).sort(sortOption);
    res.json(foods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching menu' });
  }
};

// Get single food item
exports.getFoodById = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }
    res.json(food);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching food' });
  }
};

// Add new food item (admin only)
exports.addFood = async (req, res) => {
  try {
    console.log('=== ADD FOOD REQUEST ===');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    const { 
      name, price, description, category, cuisine, 
      isVegetarian, isVegan, isGlutenFree, spicyLevel, 
      preparationTime, isPopular, isTodaySpecial 
    } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!price) {
      return res.status(400).json({ message: 'Price is required' });
    }
    
    // Handle image
    let image = '/uploads/default.jpg';
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
      console.log('Image saved at:', image);
    }
    
    // Create food object with proper parsing
    const foodData = {
      name: name.trim(),
      price: parseFloat(price),
      description: description ? description.trim() : '',
      category: category || 'Main Course',
      cuisine: cuisine || 'Indian',
      isVegetarian: isVegetarian === 'true' || isVegetarian === true,
      isVegan: isVegan === 'true' || isVegan === true,
      isGlutenFree: isGlutenFree === 'true' || isGlutenFree === true,
      spicyLevel: spicyLevel ? parseInt(spicyLevel) : 2,
      preparationTime: preparationTime ? parseInt(preparationTime) : 20,
      isPopular: isPopular === 'true' || isPopular === true,
      isTodaySpecial: isTodaySpecial === 'true' || isTodaySpecial === true,
      image: image
    };
    
    console.log('Creating food with data:', foodData);
    
    const newFood = new Food(foodData);
    await newFood.save();
    
    console.log('Food saved successfully! ID:', newFood._id);
    res.status(201).json(newFood);
    
  } catch (error) {
    console.error('=== ERROR ADDING FOOD ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Error adding food',
      error: error.message
    });
  }
};

// Update food item (admin only) - WITH OLD IMAGE DELETION
exports.updateFood = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Parse boolean values
    if (updateData.isVegetarian !== undefined) {
      updateData.isVegetarian = updateData.isVegetarian === 'true' || updateData.isVegetarian === true;
    }
    if (updateData.isPopular !== undefined) {
      updateData.isPopular = updateData.isPopular === 'true' || updateData.isPopular === true;
    }
    if (updateData.isTodaySpecial !== undefined) {
      updateData.isTodaySpecial = updateData.isTodaySpecial === 'true' || updateData.isTodaySpecial === true;
    }
    
    // Find existing food to check old image
    const existingFood = await Food.findById(id);
    if (!existingFood) {
      return res.status(404).json({ message: 'Food not found' });
    }
    
    // If new image uploaded, add path and delete old image
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
      
      // Delete old image if it exists and isn't the default
      if (existingFood.image) {
        const oldFilename = existingFood.image.replace('/uploads/', '');
        const protectedImages = ['default.jpg', 'default-food.jpg', 'placeholder.jpg'];
        
        if (!protectedImages.includes(oldFilename)) {
          const oldPath = path.join(__dirname, '../uploads', oldFilename);
          
          // Check if other items use this image
          const otherItemsUsingImage = await Food.countDocuments({
            _id: { $ne: id },
            image: existingFood.image
          });
          
          // Only delete if no other items use it and file exists
          if (otherItemsUsingImage === 0 && fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
              console.log(`🗑️ Deleted old image: ${oldFilename}`);
            } catch (err) {
              console.error('Error deleting old image:', err);
            }
          } else {
            console.log(`📌 Old image kept (used by ${otherItemsUsingImage} other items)`);
          }
        }
      }
    }

    const updatedFood = await Food.findByIdAndUpdate(id, updateData, { new: true });
    
    res.json(updatedFood);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating food' });
  }
};

// Delete food item (admin only) - WITH IMAGE DELETION
exports.deleteFood = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the food item first to get the image path
    const food = await Food.findById(id);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }
    
    let imageDeleted = false;
    
    // Check if the item has an image that's not the default
    if (food.image) {
      const filename = food.image.replace('/uploads/', '');
      const protectedImages = ['default.jpg', 'default-food.jpg', 'placeholder.jpg'];
      
      // Only delete if it's not a protected default image
      if (!protectedImages.includes(filename)) {
        const fullPath = path.join(__dirname, '../uploads', filename);
        
        // Check if file exists before attempting deletion
        if (fs.existsSync(fullPath)) {
          try {
            // Check if any OTHER menu items are using this same image
            const otherItemsUsingImage = await Food.countDocuments({
              _id: { $ne: id },
              image: food.image
            });
            
            // Only delete the file if no other items are using it
            if (otherItemsUsingImage === 0) {
              fs.unlinkSync(fullPath);
              imageDeleted = true;
              console.log(`🗑️ Deleted unused image: ${filename}`);
            } else {
              console.log(`📌 Image kept - still used by ${otherItemsUsingImage} other item(s): ${filename}`);
            }
          } catch (err) {
            console.error('Error deleting image file:', err);
            // Continue with food deletion even if image deletion fails
          }
        } else {
          console.log(`⚠️ Image file not found: ${filename}`);
        }
      } else {
        console.log(`🛡️ Protected image not deleted: ${filename}`);
      }
    }
    
    // Delete the food item from database
    await Food.findByIdAndDelete(id);
    
    res.json({ 
      message: 'Food item deleted successfully',
      imageDeleted: imageDeleted
    });
    
  } catch (error) {
    console.error('Error in deleteFood:', error);
    res.status(500).json({ message: 'Error deleting food' });
  }
};

// Toggle food availability (admin only)
exports.toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const food = await Food.findById(id);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }
    
    food.isAvailable = !food.isAvailable;
    await food.save();
    
    res.json({ 
      message: `Food is now ${food.isAvailable ? 'available' : 'unavailable'}`, 
      food 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error toggling availability' });
  }
};
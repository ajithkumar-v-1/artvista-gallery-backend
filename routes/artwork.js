// routes/artwork.js
const express = require('express');
const router = express.Router();
const Artwork = require('../models/Artwork');
const { auth, checkRole } = require('../middleware/auth');

// Create Artwork with Image URL (Artist Only)
// Add new artwork
router.post('/add', auth,checkRole(['artist']), async (req, res) => {
  try {
    const { title, description, price, image,category } = req.body;
    const artistId = req.user.userId; // Assuming the user ID is stored in req.user

    // Validate artist role if necessary
    if (req.user.role !== 'artist') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const newArtwork = new Artwork({
      title,
      description,
      price,
      image,
      category,
      artist: artistId // Set the artist field to the authenticated user's ID
    });

    await newArtwork.save();
    res.status(201).json({ message: 'Artwork added successfully', artwork: newArtwork });
  } catch (error) {
    console.error('Error adding artwork:', error.message);
    res.status(500).json({ message: 'Failed to add artwork', error: error.message });
  }
});


router.get('/', async (req, res) => {
  try {
    const artworks = await Artwork.find().populate('artist', ['username']);
    res.json(artworks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/ratings', auth,async (req, res) => {
  try {
    const artworks = await Artwork.find().select('_id averageRating');
    res.json(artworks);
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



router.post('/:artworkId/rate', auth, async (req, res) => {
  const { artworkId } = req.params;
  const { rating } = req.body;

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Invalid rating value' });
  }

  try {
    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    // Add the new rating
    artwork.ratings.push(rating);
    await artwork.save(); // This will trigger the pre-save hook to update averageRating

    res.json({ artwork: { _id: artworkId, averageRating: artwork.averageRating } });
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



router.get('/my-artworks', auth, checkRole(['artist']), async (req, res) => {
  try {
    const artistId = req.user.userId;
    const artworks = await Artwork.find({ artist: artistId });
    res.json(artworks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update Artwork (Artist Only)
router.put('/:id', auth,checkRole(['artist']), async (req, res) => {
  try {
      const artworkId = req.params.id;
      const updatedData = req.body;

      const updatedArtwork = await Artwork.findByIdAndUpdate(artworkId, updatedData, { new: true });

      if (!updatedArtwork) {
          return res.status(404).json({ message: 'Artwork not found' });
      }

      res.status(200).json(updatedArtwork);
  } catch (error) {
      console.error('Error updating artwork:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Delete Artwork (Artist Only)
router.delete('/:id', auth,checkRole(['artist']), async (req, res) => {
  try {
      const artworkId = req.params.id;
      
      // Attempt to find and delete the artwork
      const deletedArtwork = await Artwork.findByIdAndDelete(artworkId);
      
      // If artwork not found, return 404
      if (!deletedArtwork) {
          return res.status(404).json({ message: 'Artwork not found' });
      }

      // Return success response
      res.status(200).json({ message: 'Artwork deleted successfully' });
  } catch (error) {
      console.error('Error deleting artwork:', error); // Log the error
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;

// http://www.omdbapi.com/?i=tt3896198&apikey=fe14801b 
// api
// http://img.omdbapi.com/?i=tt3896198&h=600&apikey=fe14801b
// poster

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js"
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js"

const appSettings = {
    databaseURL: "https://realtime-db-moviewatchlist-default-rtdb.firebaseio.com/"
}

const app = initializeApp(appSettings)
const database = getDatabase(app)
const watchlistInDB = ref(database, "watchlist")


const textContainer = document.getElementById('result-container')
const searchInput = document.getElementById('search-input')
const searchBtn = document.getElementById('search-btn')
const startExploringContainer = document.getElementById("start-exploring-container")
const unableContainer = document.getElementById('unable-container')
const fillerTextContainer = document.getElementById("filler-text-container")

let lastSearchTerm =''

if(searchBtn){
    searchBtn.addEventListener('click', function(){
        const searchTerm = searchInput.value.trim()
    
        if(searchTerm === lastSearchTerm){
            alert("You've already searched for this term. Please try a different one.")
            return
        }
    
        if(searchTerm){
            getMovieData(searchTerm)
            lastSearchTerm = searchTerm
            
        }else{
            alert("Please Enter a Search Term")
        }
        startExploringContainer.style.display = "none"
    })
}


async function getMovieData(searchTerm) {
    try {
        const formattedSearchTerm = searchTerm.replace(/\s+/g, '+')
        const response = await fetch(`http://www.omdbapi.com/?s=${formattedSearchTerm}&apikey=fe14801b`)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json() 

        if (data.Search && data.Search.length > 0) {
            textContainer.innerHTML = ''

            for (let i = 0; i < data.Search.length; i++) {
                const movie = data.Search[i];
                const movieResponse = await fetch(`http://www.omdbapi.com/?i=${movie.imdbID}&apikey=fe14801b`);
                const movieData = await movieResponse.json();
                updateUI(movieData);
                unableContainer.innerHTML = ``
            }
        } else {
            unableContainer.innerHTML =`
            <h2 id="unable-to-find">Unable to find what you’re looking for. Please try another search.</h2>
            `
        }
    } catch (error) {
        console.error('There was an error!', error)
    }
}

async function updateUI(movie){
    const posterResponse = await fetch(`http://img.omdbapi.com/?i=${movie.imdbID}&h=600&apikey=fe14801b`) 
    const posterData = await posterResponse.blob()
    const url = URL.createObjectURL(posterData)

    textContainer.innerHTML +=`
    <div id="movie-container">
                <img id="movie-poster" src="${movie.Poster}" alt="Movie Poster"/>
                <div id="text-container">
                    <div id="movie-header-container">
                        <h2 id="movie-title">${movie.Title}</h2>
                        <p id="movie-rating"><span>⭐</span>${movie.Ratings[0].Value}</p>
                    </div>
                    <p id="movie-year">${movie.Year} </p>
                    <p id="movie-actors">${movie.Actors} </p>
                    <div id="movie-subheading-container">
                        <p id="movie-runtime">${movie.Runtime}</p>
                        <p id="movie-genre">${movie.Genre}</p>
                        <a class="movie-watchlist" data-imdbid="${movie.imdbID}"> <span id="plus-icon">+</span> Watchlist</a>
                    </div>
                    <p id="movie-description">${movie.Plot} </p>
                </div>
            </div>
    `
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('movie-watchlist')) {
        const imdbID = e.target.getAttribute('data-imdbid');
        console.log("Adding movie with IMDb ID:", imdbID); // For debugging
        addMovieToWatchlist(imdbID);
        showPopup("Added to Watchlist"); // Call the popup function with the message

        // Check if fillerTextContainer is not null, which would mean you're on the correct page.
        if (fillerTextContainer) {
            fillerTextContainer.style.display = "none";
        }
    }
});


function addMovieToWatchlist(imdbID) {
    console.log("Pushing to database:", imdbID); // For debugging
    push(watchlistInDB, { imdbID })
    .then(() => console.log("Movie added to watchlist successfully"))
    .catch((error) => console.error("Error adding movie to watchlist:", error));
}

if (document.getElementById('watchlist-container')) {
    onValue(watchlistInDB, (snapshot) => {
        const movies = snapshot.val();
        displayWatchlistMovies(movies);
    });
}

function displayWatchlistMovies(movies) {
    const container = document.getElementById('watchlist-container');
    container.innerHTML = ''; 
    if (movies && Object.keys(movies).length > 0){
        if (fillerTextContainer) {
            fillerTextContainer.style.display = "none";
        }
        for (const key in movies) {
            fetch(`http://www.omdbapi.com/?i=${movies[key].imdbID}&apikey=fe14801b`)
                .then(response => response.json())
                .then(movie => {
                    container.innerHTML += `
                <div id="movie-container">
                    <img id="movie-poster" src="${movie.Poster}" alt="Movie Poster"/>
                    <div id="text-container">
                        <div id="movie-header-container">
                            <h2 id="movie-title">${movie.Title}</h2>
                            <p id="movie-rating"><span>⭐</span>${movie.Ratings[0].Value}</p>
                        </div>
                        <p id="movie-year">${movie.Year} </p>
                        <p id="movie-actors">${movie.Actors} </p>
                        <div id="movie-subheading-container">
                            <p id="movie-runtime">${movie.Runtime}</p>
                            <p id="movie-genre">${movie.Genre}</p>
                            <a class="movie-remove" data-key="${key}"> <span id="remove-icon">-</span> Remove</a>
                        </div>
                        <p id="movie-description">${movie.Plot} </p>
                    </div>
                </div>
                    `
            })
        }
    }else{
        if (fillerTextContainer) {
            fillerTextContainer.style.display = "flex"
        }
    }
    container.addEventListener('click', function(e) {
        if (e.target.classList.contains('movie-remove')) {
        const movieKey = e.target.getAttribute('data-key');
        removeMovie(movieKey);
        showPopup("Removed from Watchlist");
        }
    });
}

function removeMovie(movieKey) {
    const movieRef = ref(database, 'watchlist/' + movieKey);
    remove(movieRef)
        .then(() => {
        console.log("Movie removed successfully");
        const movieContainer = document.querySelector(`[data-key="${movieKey}"]`).closest('.movie-container');
        movieContainer.remove();
            if (document.querySelectorAll('.movie-container').length === 0) {
                if (fillerTextContainer) {
                    fillerTextContainer.style.display = "flex";
                }
            }
        })
    .catch((error) => {
        console.error("Error removing movie: ", error);
    });
}

function showPopup(message) {
    const popupContainer = document.getElementById('popup-container');
    const watchlistPopup = document.getElementById('watchlist-popup');
    watchlistPopup.textContent = message; // Set the popup message
    popupContainer.classList.add('popup-show');
    popupContainer.style.display = 'block'; // Show the popup
  
    // Hide the popup after 3 seconds
    setTimeout(() => {
      popupContainer.style.display = 'none';
      popupContainer.classList.remove('popup-show');
    }, 2000);
  }
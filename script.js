/* ═══════════════════════════════════════════════════════════════
   POKEDEX - MAIN SCRIPT
   ═══════════════════════════════════════════════════════════════ */

class Pokedex {
    constructor() {
        this.currentPokemonId = 1;
        this.maxPokemonId = 151; // Original 151
        this.cache = new Map();
        this.isLoading = false;
        this.isSearchOpen = false;
        this.konamiProgress = 0;
        this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        this.shinyMode = false;
        this.lastViewedId = null;
        
        // DOM Elements
        this.elements = {
            loading: document.getElementById('loading'),
            pokemonDisplay: document.getElementById('pokemonDisplay'),
            errorState: document.getElementById('errorState'),
            missingnoState: document.getElementById('missingnoState'),
            searchOverlay: document.getElementById('searchOverlay'),
            searchInput: document.getElementById('searchInput'),
            
            pokemonNumber: document.getElementById('pokemonNumber'),
            pokemonName: document.getElementById('pokemonName'),
            pokemonTypes: document.getElementById('pokemonTypes'),
            pokemonSprite: document.getElementById('pokemonSprite'),
            pokemonStats: document.getElementById('pokemonStats'),
            pokemonDescription: document.getElementById('pokemonDescription'),
            
            cryButton: document.getElementById('cryButton'),
            pokemonCry: document.getElementById('pokemonCry'),
            
            btnUp: document.getElementById('btnUp'),
            btnDown: document.getElementById('btnDown'),
            btnLeft: document.getElementById('btnLeft'),
            btnRight: document.getElementById('btnRight'),
            btnA: document.getElementById('btnA'),
            btnB: document.getElementById('btnB'),
            
            wrapper: document.querySelector('.pokedex-wrapper')
        };
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        this.loadLastViewed();
        await this.loadPokemon(this.currentPokemonId);
    }
    
    bindEvents() {
        // D-Pad buttons
        this.elements.btnUp.addEventListener('click', () => this.navigate(-1));
        this.elements.btnDown.addEventListener('click', () => this.navigate(1));
        this.elements.btnLeft.addEventListener('click', () => this.navigate(-10));
        this.elements.btnRight.addEventListener('click', () => this.navigate(10));
        
        // Action buttons
        this.elements.btnA.addEventListener('click', () => this.toggleSearch());
        this.elements.btnB.addEventListener('click', () => this.randomPokemon());
        
        // Cry button
        this.elements.cryButton.addEventListener('click', () => this.playCry());
        
        // Search input
        this.elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.search();
            } else if (e.key === 'Escape') {
                this.closeSearch();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Click outside search to close
        this.elements.searchOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.searchOverlay) {
                this.closeSearch();
            }
        });
    }
    
    handleKeyboard(e) {
        // Konami code detection
        this.checkKonamiCode(e.key);
        
        // If search is open, don't handle navigation
        if (this.isSearchOpen) return;
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.navigate(-1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigate(1);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.navigate(-10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.navigate(10);
                break;
            case 'a':
            case 'A':
            case 'Enter':
                this.toggleSearch();
                break;
            case 'b':
            case 'B':
                this.randomPokemon();
                break;
            case ' ':
                e.preventDefault();
                this.playCry();
                break;
        }
    }
    
    checkKonamiCode(key) {
        if (key === this.konamiCode[this.konamiProgress]) {
            this.konamiProgress++;
            if (this.konamiProgress === this.konamiCode.length) {
                this.activateShinyMode();
                this.konamiProgress = 0;
            }
        } else {
            this.konamiProgress = 0;
        }
    }
    
    activateShinyMode() {
        this.shinyMode = !this.shinyMode;
        console.log(`🌟 Shiny mode ${this.shinyMode ? 'activated' : 'deactivated'}!`);
        this.loadPokemon(this.currentPokemonId);
    }
    
    navigate(delta) {
        if (this.isLoading) return;
        
        let newId = this.currentPokemonId + delta;
        
        // Wrap around
        if (newId < 0) newId = this.maxPokemonId;
        if (newId > this.maxPokemonId) newId = 1;
        if (newId === 0) newId = delta > 0 ? 1 : this.maxPokemonId;
        
        this.loadPokemon(newId);
    }
    
    randomPokemon() {
        if (this.isLoading) return;
        
        // Small chance to get MissingNo
        if (Math.random() < 0.02) {
            this.showMissingNo();
            return;
        }
        
        let randomId;
        do {
            randomId = Math.floor(Math.random() * this.maxPokemonId) + 1;
        } while (randomId === this.currentPokemonId);
        
        this.loadPokemon(randomId);
    }
    
    toggleSearch() {
        if (this.isSearchOpen) {
            this.closeSearch();
        } else {
            this.openSearch();
        }
    }
    
    openSearch() {
        this.isSearchOpen = true;
        this.elements.searchOverlay.classList.add('show');
        this.elements.searchInput.value = '';
        this.elements.searchInput.focus();
    }
    
    closeSearch() {
        this.isSearchOpen = false;
        this.elements.searchOverlay.classList.remove('show');
        this.elements.searchInput.blur();
    }
    
    async search() {
        const query = this.elements.searchInput.value.trim().toLowerCase();
        if (!query) return;
        
        this.closeSearch();
        
        // Check for MissingNo Easter egg
        if (query === 'missingno' || query === '0' || query === '000') {
            this.showMissingNo();
            return;
        }
        
        // Check if it's a number
        const numQuery = parseInt(query.replace('#', ''));
        if (!isNaN(numQuery) && numQuery >= 1 && numQuery <= this.maxPokemonId) {
            this.loadPokemon(numQuery);
            return;
        }
        
        // Search by name
        try {
            await this.loadPokemon(query);
        } catch (error) {
            this.showError();
        }
    }
    
    async loadPokemon(idOrName) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.hideAllStates();
        this.elements.loading.classList.remove('hidden');
        
        try {
            // Check cache
            const cacheKey = String(idOrName).toLowerCase();
            let pokemon = this.cache.get(cacheKey);
            
            if (!pokemon) {
                // Fetch from API
                const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
                if (!response.ok) throw new Error('Pokemon not found');
                pokemon = await response.json();
                
                // Cache it
                this.cache.set(cacheKey, pokemon);
                this.cache.set(String(pokemon.id), pokemon);
                this.cache.set(pokemon.name, pokemon);
            }
            
            // Fetch species data for flavor text
            let species = this.cache.get(`species-${pokemon.id}`);
            if (!species) {
                const speciesResponse = await fetch(pokemon.species.url);
                species = await speciesResponse.json();
                this.cache.set(`species-${pokemon.id}`, species);
            }
            
            this.currentPokemonId = pokemon.id;
            this.saveLastViewed();
            this.displayPokemon(pokemon, species);
            this.triggerEasterEggs(pokemon);
            
        } catch (error) {
            console.error('Failed to load Pokemon:', error);
            this.showError();
        } finally {
            this.isLoading = false;
            this.elements.loading.classList.add('hidden');
        }
    }
    
    displayPokemon(pokemon, species) {
        // Number and Name
        this.elements.pokemonNumber.textContent = `#${String(pokemon.id).padStart(3, '0')}`;
        this.elements.pokemonName.textContent = pokemon.name.toUpperCase();
        
        // Types
        this.elements.pokemonTypes.innerHTML = pokemon.types.map(t => 
            `<span class="type-badge" style="background-color: var(--type-${t.type.name})">${t.type.name}</span>`
        ).join('');
        
        // Sprite
        const spriteUrl = this.shinyMode 
            ? (pokemon.sprites.front_shiny || pokemon.sprites.front_default)
            : pokemon.sprites.front_default;
        this.elements.pokemonSprite.src = spriteUrl;
        this.elements.pokemonSprite.alt = pokemon.name;
        
        if (this.shinyMode) {
            this.elements.pokemonSprite.classList.add('shiny');
        } else {
            this.elements.pokemonSprite.classList.remove('shiny');
        }
        
        // Stats
        const statMap = {
            'hp': 'hp',
            'attack': 'attack',
            'defense': 'defense',
            'speed': 'speed'
        };
        
        pokemon.stats.forEach(stat => {
            const statName = stat.stat.name;
            if (statMap[statName]) {
                const fill = this.elements.pokemonStats.querySelector(`.stat-fill[data-stat="${statMap[statName]}"]`);
                const value = this.elements.pokemonStats.querySelector(`.stat-value[data-stat="${statMap[statName]}"]`);
                
                if (fill && value) {
                    const percentage = Math.min((stat.base_stat / 150) * 100, 100);
                    fill.style.width = `${percentage}%`;
                    value.textContent = stat.base_stat;
                }
            }
        });
        
        // Flavor text (find English entry)
        const flavorEntry = species.flavor_text_entries.find(e => e.language.name === 'en');
        const flavorText = flavorEntry 
            ? flavorEntry.flavor_text.replace(/[\n\f]/g, ' ')
            : 'No data available.';
        this.elements.pokemonDescription.textContent = flavorText;
        
        // Set cry URL
        this.elements.pokemonCry.src = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemon.id}.ogg`;
        
        // Show display
        this.elements.pokemonDisplay.classList.remove('hidden');
    }
    
    hideAllStates() {
        this.elements.pokemonDisplay.classList.add('hidden');
        this.elements.errorState.classList.remove('show');
        this.elements.missingnoState.classList.remove('show');
    }
    
    showError() {
        this.hideAllStates();
        this.elements.loading.classList.add('hidden');
        this.elements.errorState.classList.add('show');
        
        setTimeout(() => {
            this.elements.errorState.classList.remove('show');
            this.loadPokemon(this.currentPokemonId);
        }, 2000);
    }
    
    showMissingNo() {
        this.hideAllStates();
        this.elements.loading.classList.add('hidden');
        this.elements.missingnoState.classList.add('show');
        
        // Glitch effect on wrapper
        this.elements.wrapper.style.animation = 'none';
        setTimeout(() => {
            this.elements.wrapper.style.animation = '';
        }, 10);
        
        setTimeout(() => {
            this.elements.missingnoState.classList.remove('show');
            this.loadPokemon(this.currentPokemonId || 1);
        }, 3000);
    }
    
    playCry() {
        const audio = this.elements.pokemonCry;
        if (audio.src) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
            
            this.elements.cryButton.classList.add('playing');
            setTimeout(() => {
                this.elements.cryButton.classList.remove('playing');
            }, 500);
        }
    }
    
    // ───────────────────────────────────────────────────────────
    // EASTER EGGS
    // ───────────────────────────────────────────────────────────
    
    triggerEasterEggs(pokemon) {
        const wrapper = this.elements.wrapper;
        const sprite = this.elements.pokemonSprite;
        
        // Clean up previous effects
        wrapper.classList.remove('pikachu-flash', 'snorlax-sleep');
        sprite.classList.remove('ditto-transform', 'magikarp-splash');
        
        switch (pokemon.id) {
            case 25: // Pikachu
                wrapper.classList.add('pikachu-flash');
                setTimeout(() => wrapper.classList.remove('pikachu-flash'), 500);
                break;
                
            case 132: // Ditto
                if (this.lastViewedId && this.lastViewedId !== 132) {
                    sprite.classList.add('ditto-transform');
                    setTimeout(() => sprite.classList.remove('ditto-transform'), 600);
                }
                break;
                
            case 129: // Magikarp
                sprite.classList.add('magikarp-splash');
                this.showMagikarpMessage();
                setTimeout(() => sprite.classList.remove('magikarp-splash'), 600);
                break;
                
            case 143: // Snorlax
                wrapper.classList.add('snorlax-sleep');
                this.showSnorlaxZzz();
                setTimeout(() => wrapper.classList.remove('snorlax-sleep'), 2000);
                break;
                
            case 151: // Mew
                if (this.currentPokemonId === 151) {
                    this.showMewMessage();
                }
                break;
        }
        
        this.lastViewedId = pokemon.id;
    }
    
    showMagikarpMessage() {
        const desc = this.elements.pokemonDescription;
        const originalText = desc.textContent;
        desc.textContent = '...pathetic... or is it? 🐟';
        setTimeout(() => {
            desc.textContent = originalText;
        }, 2000);
    }
    
    showSnorlaxZzz() {
        const container = this.elements.pokemonSprite.parentElement;
        const zzz = document.createElement('div');
        zzz.textContent = '💤';
        zzz.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 1.5rem;
            animation: float 1s ease-in-out infinite;
        `;
        container.appendChild(zzz);
        
        // Add float animation
        if (!document.getElementById('floatAnimation')) {
            const style = document.createElement('style');
            style.id = 'floatAnimation';
            style.textContent = `
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => zzz.remove(), 2000);
    }
    
    showMewMessage() {
        console.log('🎉 Congratulations! You found all 151 Pokémon!');
    }
    
    // ───────────────────────────────────────────────────────────
    // PERSISTENCE
    // ───────────────────────────────────────────────────────────
    
    saveLastViewed() {
        try {
            localStorage.setItem('pokedex-last-viewed', String(this.currentPokemonId));
        } catch (e) {}
    }
    
    loadLastViewed() {
        try {
            const saved = localStorage.getItem('pokedex-last-viewed');
            if (saved) {
                const id = parseInt(saved);
                if (id >= 1 && id <= this.maxPokemonId) {
                    this.currentPokemonId = id;
                }
            }
        } catch (e) {}
    }
}


// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    new Pokedex();
});


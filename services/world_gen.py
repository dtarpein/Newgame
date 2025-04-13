import random
import json
import math
from perlin_noise import PerlinNoise

class WorldGenerator:
    """Service for procedurally generating game worlds"""
    
    def __init__(self, llm_service):
        """Initialize with LLM service for narrative generation"""
        self.llm_service = llm_service
    
    def generate_region(self, theme, difficulty, player_level):
        """Generate a new region with theme, landmarks, and map data"""
        # Try to get region from LLM
        try:
            region_data = self.llm_service.generate_region(theme, difficulty, player_level)
            # Validate the response
            if self._validate_region_data(region_data):
                return region_data
        except Exception as e:
            print(f"LLM region generation failed: {e}")
        
        # Fallback to procedural generation
        return self._generate_procedural_region(theme, difficulty, player_level)
    
    def _validate_region_data(self, region_data):
        """Validate region data structure"""
        required_keys = ['name', 'description', 'map_data', 'landmarks']
        if not all(key in region_data for key in required_keys):
            return False
        
        if not isinstance(region_data['map_data'], dict):
            return False
        
        map_keys = ['width', 'height', 'tiles']
        if not all(key in region_data['map_data'] for key in map_keys):
            return False
        
        if not isinstance(region_data['landmarks'], list):
            return False
        
        return True
    
    def _generate_procedural_region(self, theme, difficulty, player_level):
        """Procedurally generate a region without LLM"""
        # Region name based on theme
        themes = {
            'forest': ["Whispering Woods", "Ancient Grove", "Verdant Wilderness", "Emerald Canopy"],
            'mountain': ["Craggy Peaks", "Mist-Shrouded Heights", "Stone Sentinels", "Clouded Summit"],
            'desert': ["Endless Sands", "Scorched Wastes", "Dune Sea", "Sun's Anvil"],
            'swamp': ["Murky Depths", "Foggy Marshland", "Mire of Shadows", "Boggy Lowlands"],
            'town': ["Crossroads Haven", "Trader's Rest", "Hillside Settlement", "Riverside Village"],
            'dungeon': ["Forgotten Depths", "Shadow Labyrinth", "Ancient Vault", "Ruined Chambers"]
        }
        
        default_theme = 'forest'
        if theme not in themes:
            theme = default_theme
        
        name = random.choice(themes[theme])
        
        # Region description
        descriptions = {
            'forest': f"A dense woodland where sunlight filters through the canopy in dappled patterns. The trees stand ancient and watchful, home to countless creatures both mundane and magical. The difficulty level is {difficulty}, suitable for level {player_level} adventurers.",
            'mountain': f"Towering peaks rise majestically into the clouds, their slopes dotted with pine and rocky outcroppings. The thin air carries the distant cry of hunting birds. The difficulty level is {difficulty}, suitable for level {player_level} adventurers.",
            'desert': f"An endless expanse of shifting sand dunes under a merciless sun. By day the heat is unbearable, by night the cold is biting. Strange mirages appear on the horizon. The difficulty level is {difficulty}, suitable for level {player_level} adventurers.",
            'swamp': f"Murky waters wind between gnarled cypress trees draped in hanging moss. The air is thick with humidity and the buzz of insects. Deceptive footing makes travel treacherous. The difficulty level is {difficulty}, suitable for level {player_level} adventurers.",
            'town': f"A settlement of wooden and stone buildings where people go about their daily business. The central square features a well, and merchants hawk their wares from stalls. The difficulty level is {difficulty}, suitable for level {player_level} adventurers.",
            'dungeon': f"Ancient stonework corridors stretch into darkness, their walls inscribed with worn symbols. The air is stale and carries echoes from unseen chambers deeper within. The difficulty level is {difficulty}, suitable for level {player_level} adventurers."
        }
        
        description = descriptions.get(theme, descriptions[default_theme])
        
        # Generate map using perlin noise for natural-looking terrain
        width, height = 32, 32
        map_data = self._generate_terrain_map(width, height, theme)
        
        # Generate landmarks
        landmarks = self._generate_landmarks(width, height, theme, difficulty)
        
        # Add paths between landmarks
        map_data['tiles'] = self._add_paths_between_landmarks(map_data['tiles'], landmarks)
        
        return {
            "name": name,
            "description": description,
            "map_data": map_data,
            "landmarks": landmarks
        }
    
    def _generate_terrain_map(self, width, height, theme):
        """Generate terrain using perlin noise"""
        # Initialize perlin noise generators
        seed = random.randint(0, 1000)
        noise1 = PerlinNoise(octaves=3, seed=seed)
        noise2 = PerlinNoise(octaves=6, seed=seed+1)
        noise3 = PerlinNoise(octaves=12, seed=seed+2)
        
        # Define tile types for each theme
        theme_tiles = {
            'forest': {
                'primary': 'forest',
                'secondary': 'grass',
                'tertiary': 'water',
                'accent': 'rock'
            },
            'mountain': {
                'primary': 'mountain',
                'secondary': 'rock',
                'tertiary': 'grass',
                'accent': 'snow'
            },
            'desert': {
                'primary': 'sand',
                'secondary': 'dune',
                'tertiary': 'rock',
                'accent': 'cactus'
            },
            'swamp': {
                'primary': 'swamp',
                'secondary': 'water',
                'tertiary': 'grass',
                'accent': 'tree'
            },
            'town': {
                'primary': 'grass',
                'secondary': 'path',
                'tertiary': 'building',
                'accent': 'water'
            },
            'dungeon': {
                'primary': 'stone',
                'secondary': 'corridor',
                'tertiary': 'wall',
                'accent': 'door'
            }
        }
        
        # Default to forest if theme not recognized
        tile_set = theme_tiles.get(theme, theme_tiles['forest'])
        
        # Generate tiles
        tiles = []
        for y in range(height):
            row = []
            for x in range(width):
                # Normalize x,y to -1 to 1
                nx, ny = x/width - 0.5, y/height - 0.5
                
                # Combine noise at different frequencies
                noise_val = noise1([nx, ny]) * 0.5 + noise2([nx, ny]) * 0.3 + noise3([nx, ny]) * 0.2
                
                # Assign tile based on noise value
                if noise_val < -0.15:
                    tile = tile_set['tertiary']
                elif noise_val < 0.1:
                    tile = tile_set['secondary']
                elif noise_val < 0.35:
                    tile = tile_set['primary']
                else:
                    tile = tile_set['accent']
                
                row.append(tile)
            tiles.append(row)
        
        # Additional processing for specific themes
        if theme == 'town':
            tiles = self._add_town_features(tiles, width, height)
        elif theme == 'dungeon':
            tiles = self._generate_dungeon_layout(width, height)
        
        return {
            "width": width,
            "height": height,
            "tiles": tiles
        }
    
    def _add_town_features(self, tiles, width, height):
        """Add town-specific features to the map"""
        # Add central square
        center_x, center_y = width // 2, height // 2
        square_size = min(width, height) // 6
        
        for y in range(center_y - square_size, center_y + square_size + 1):
            for x in range(center_x - square_size, center_x + square_size + 1):
                if 0 <= x < width and 0 <= y < height:
                    # Square interior is path
                    tiles[y][x] = 'path'
                    
                    # Add a well in the center
                    if x == center_x and y == center_y:
                        tiles[y][x] = 'well'
        
        # Add buildings around the square
        building_locations = []
        for i in range(8):  # Add several buildings
            # Position around the central square
            angle = i * math.pi / 4  # Evenly space around a circle
            distance = square_size + 3
            bx = int(center_x + math.cos(angle) * distance)
            by = int(center_y + math.sin(angle) * distance)
            
            if 2 <= bx < width - 2 and 2 <= by < height - 2:
                building_locations.append((bx, by))
                
                # Create a building (3x3 area)
                for by_offset in range(-1, 2):
                    for bx_offset in range(-1, 2):
                        x, y = bx + bx_offset, by + by_offset
                        if 0 <= x < width and 0 <= y < height:
                            tiles[y][x] = 'building'
        
        # Add paths connecting buildings to the central square
        for bx, by in building_locations:
            # Draw path from building to square
            path_x, path_y = bx, by
            while not (center_x - square_size <= path_x <= center_x + square_size and 
                      center_y - square_size <= path_y <= center_y + square_size):
                # Move toward the square
                if path_x < center_x:
                    path_x += 1
                elif path_x > center_x:
                    path_x -= 1
                elif path_y < center_y:
                    path_y += 1
                elif path_y > center_y:
                    path_y -= 1
                
                if 0 <= path_x < width and 0 <= path_y < height and tiles[path_y][path_x] != 'building':
                    tiles[path_y][path_x] = 'path'
        
        return tiles
    
    def _generate_dungeon_layout(self, width, height):
        """Generate a dungeon layout with rooms and corridors"""
        # Start with all walls
        tiles = [['wall' for _ in range(width)] for _ in range(height)]
        
        # Room size limits
        min_room_size = 3
        max_room_size = 6
        
        # Create a few rooms
        rooms = []
        for _ in range(10):  # Try to place 10 rooms
            room_width = random.randint(min_room_size, max_room_size)
            room_height = random.randint(min_room_size, max_room_size)
            room_x = random.randint(1, width - room_width - 1)
            room_y = random.randint(1, height - room_height - 1)
            
            # Check for overlap with existing rooms
            overlap = False
            for existing_room in rooms:
                rx, ry, rw, rh = existing_room
                if (room_x <= rx + rw and rx <= room_x + room_width and
                    room_y <= ry + rh and ry <= room_y + room_height):
                    overlap = True
                    break
            
            if not overlap:
                rooms.append((room_x, room_y, room_width, room_height))
                
                # Carve out the room
                for y in range(room_y, room_y + room_height):
                    for x in range(room_x, room_x + room_width):
                        tiles[y][x] = 'stone'
        
        # Connect rooms with corridors
        for i in range(len(rooms) - 1):
            room1 = rooms[i]
            room2 = rooms[i + 1]
            
            # Center points of rooms
            x1 = room1[0] + room1[2] // 2
            y1 = room1[1] + room1[3] // 2
            x2 = room2[0] + room2[2] // 2
            y2 = room2[1] + room2[3] // 2
            
            # Draw L-shaped corridor
            # Horizontal segment
            for x in range(min(x1, x2), max(x1, x2) + 1):
                tiles[y1][x] = 'corridor'
            
            # Vertical segment
            for y in range(min(y1, y2), max(y1, y2) + 1):
                tiles[y][x2] = 'corridor'
        
        # Add doors between rooms and corridors
        for room in rooms:
            rx, ry, rw, rh = room
            
            # Try to place a door on each side of the room
            door_placed = False
            
            # Top side
            for x in range(rx, rx + rw):
                if ry > 0 and tiles[ry - 1][x] == 'corridor':
                    tiles[ry][x] = 'door'
                    door_placed = True
                    break
            
            # Bottom side
            if not door_placed:
                for x in range(rx, rx + rw):
                    if ry + rh < height - 1 and tiles[ry + rh][x] == 'corridor':
                        tiles[ry + rh - 1][x] = 'door'
                        door_placed = True
                        break
            
            # Left side
            if not door_placed:
                for y in range(ry, ry + rh):
                    if rx > 0 and tiles[y][rx - 1] == 'corridor':
                        tiles[y][rx] = 'door'
                        door_placed = True
                        break
            
            # Right side
            if not door_placed:
                for y in range(ry, ry + rh):
                    if rx + rw < width - 1 and tiles[y][rx + rw] == 'corridor':
                        tiles[y][rx + rw - 1] = 'door'
                        break
        
        return tiles
    
    def _generate_landmarks(self, width, height, theme, difficulty):
        """Generate landmarks for the region"""
        landmarks = []
        
        # Number of landmarks scales with difficulty
        num_landmarks = max(3, min(7, difficulty + 2))
        
        # Define landmark types appropriate for each theme
        theme_landmarks = {
            'forest': ['grove', 'clearing', 'ancient_tree', 'waterfall', 'cave', 'ruins'],
            'mountain': ['peak', 'cave', 'lookout', 'mine', 'pass', 'shrine'],
            'desert': ['oasis', 'pyramid', 'mesa', 'ruins', 'canyon', 'mirage'],
            'swamp': ['hut', 'pool', 'dead_tree', 'fungi_cluster', 'mound', 'statue'],
            'town': ['inn', 'market', 'blacksmith', 'temple', 'manor', 'fountain'],
            'dungeon': ['throne_room', 'crypt', 'library', 'laboratory', 'treasure_room', 'altar']
        }
        
        landmark_types = theme_landmarks.get(theme, theme_landmarks['forest'])
        
        # Landmark name generators
        name_generators = {
            'forest': {
                'grove': lambda: f"The {random.choice(['Whispering', 'Ancient', 'Sacred', 'Hidden', 'Moonlit'])} Grove",
                'clearing': lambda: f"{random.choice(['Sunny', 'Peaceful', 'Hunters', 'Fey', 'Mystic'])} Clearing",
                'ancient_tree': lambda: f"The {random.choice(['Elder', 'Grandfather', 'World', 'Heart', 'Spirit'])} Tree",
                'waterfall': lambda: f"{random.choice(['Veil', 'Misty', 'Rainbow', 'Silver', 'Thunder'])} Falls",
                'cave': lambda: f"{random.choice(['Shadow', 'Bear', 'Echo', 'Crystal', 'Wind'])} Cave",
                'ruins': lambda: f"{random.choice(['Forgotten', 'Overgrown', 'Elven', 'Ancient', 'Moss-covered'])} Ruins"
            },
            # Add other themes with their landmark name generators
        }
        
        # Track used positions to avoid overlap
        used_positions = set()
        
        # Ensure variance in landmark types
        selected_types = random.sample(landmark_types, min(num_landmarks, len(landmark_types)))
        if len(selected_types) < num_landmarks:
            # If we need more landmarks than types, repeat some types
            selected_types.extend(random.choices(landmark_types, k=num_landmarks - len(selected_types)))
        
        for i, landmark_type in enumerate(selected_types):
            # Try to find unused position
            attempts = 0
            while attempts < 20:  # Limit attempts to prevent infinite loop
                # Keep landmarks away from edges
                x = random.randint(2, width - 3)
                y = random.randint(2, height - 3)
                pos = (x, y)
                
                # Check if position is at least 5 tiles away from other landmarks
                too_close = False
                for lx, ly in used_positions:
                    if abs(x - lx) < 5 and abs(y - ly) < 5:
                        too_close = True
                        break
                
                if not too_close:
                    used_positions.add(pos)
                    break
                attempts += 1
            
            # If couldn't find a good position, skip this landmark
            if attempts >= 20:
                continue
            
            # Generate name
            if theme in name_generators and landmark_type in name_generators[theme]:
                name = name_generators[theme][landmark_type]()
            else:
                adjectives = ["Ancient", "Mystic", "Hidden", "Forgotten", "Sacred", "Mysterious"]
                name = f"The {random.choice(adjectives)} {landmark_type.replace('_', ' ').title()}"
            
            # Generate description
            descriptions = {
                'forest': {
                    'grove': "A tranquil circle of trees where sunlight filters through the canopy in mesmerizing patterns.",
                    'clearing': "An open area in the forest where the sky is visible and wildlife often gathers.",
                    'ancient_tree': "A massive tree of immense age, its trunk wider than several people standing together.",
                    'waterfall': "A cascade of water tumbling down mossy rocks, creating a constant ambient roar.",
                    'cave': "A dark opening in the forest floor or hillside, promising secrets within.",
                    'ruins': "Crumbling stone structures, remnants of a civilization long forgotten."
                },
                # Add descriptions for other themes and landmark types
            }
            
            if theme in descriptions and landmark_type in descriptions[theme]:
                description = descriptions[theme][landmark_type]
            else:
                description = f"A notable {landmark_type.replace('_', ' ')} location in the {theme}."
            
            # Determine landmark category
            if landmark_type in ['inn', 'market', 'blacksmith', 'village', 'camp', 'outpost']:
                category = 'settlement'
            elif landmark_type in ['cave', 'mine', 'crypt', 'dungeon', 'temple', 'ruins']:
                category = 'dungeon'
            elif landmark_type in ['grove', 'waterfall', 'peak', 'oasis', 'clearing']:
                category = 'natural'
            else:
                category = 'point_of_interest'
            
            landmarks.append({
                "name": name,
                "description": description,
                "type": category,
                "x": x,
                "y": y
            })
        
        return landmarks
    
    def _add_paths_between_landmarks(self, tiles, landmarks):
        """Add paths connecting landmarks"""
        if len(landmarks) <= 1:
            return tiles
        
        height = len(tiles)
        width = len(tiles[0]) if height > 0 else 0
        
        # Create a copy of the tiles
        new_tiles = [row.copy() for row in tiles]
        
        # Connect landmarks with paths
        for i in range(len(landmarks) - 1):
            start_x, start_y = landmarks[i]['x'], landmarks[i]['y']
            end_x, end_y = landmarks[i + 1]['x'], landmarks[i + 1]['y']
            
            # Use A* pathfinding to create natural-looking paths
            path = self._find_path(tiles, start_x, start_y, end_x, end_y)
            
            for x, y in path:
                if 0 <= x < width and 0 <= y < height:
                    # Don't overwrite landmarks
                    is_landmark = False
                    for landmark in landmarks:
                        if x == landmark['x'] and y == landmark['y']:
                            is_landmark = True
                            break
                    
                    if not is_landmark:
                        # Replace with path tile (unless it's water/wall)
                        current_tile = tiles[y][x]
                        if current_tile not in ['water', 'wall', 'door']:
                            new_tiles[y][x] = 'path'
        
        return new_tiles
    
    def _find_path(self, tiles, start_x, start_y, end_x, end_y):
        """Find a path between two points using A* algorithm"""
        height = len(tiles)
        width = len(tiles[0]) if height > 0 else 0
        
        # Define movement costs for different tiles
        tile_costs = {
            'path': 1,
            'grass': 2,
            'forest': 3,
            'sand': 2,
            'rock': 4,
            'mountain': 5,
            'swamp': 4,
            'water': 10,  # High cost to avoid water
            'wall': 50,   # Very high cost to avoid walls
            'door': 1,
            'corridor': 1,
            'stone': 2
        }
        
        # Define default cost for unknown tiles
        default_cost = 2
        
        # A* algorithm
        open_set = [(0, 0, start_x, start_y, [])]  # (f_score, g_score, x, y, path)
        closed_set = set()
        
        while open_set:
            open_set.sort()  # Sort by f_score
            _, g_score, x, y, path = open_set.pop(0)
            
            # Check if we've reached the destination
            if x == end_x and y == end_y:
                return path + [(x, y)]
            
            # Skip if we've already processed this node
            if (x, y) in closed_set:
                continue
            
            closed_set.add((x, y))
            
            # Try all four directions
            for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                nx, ny = x + dx, y + dy
                
                # Skip if out of bounds
                if nx < 0 or nx >= width or ny < 0 or ny >= height:
                    continue
                
                # Skip if already processed
                if (nx, ny) in closed_set:
                    continue
                
                # Get tile cost
                tile = tiles[ny][nx]
                move_cost = tile_costs.get(tile, default_cost)
                
                # Calculate scores
                new_g = g_score + move_cost
                h = abs(nx - end_x) + abs(ny - end_y)  # Manhattan distance
                f = new_g + h
                
                # Add to open set
                open_set.append((f, new_g, nx, ny, path + [(x, y)]))
        
        # If no path found, return a straight line
        path = []
        x, y = start_x, start_y
        while x != end_x or y != end_y:
            path.append((x, y))
            if x < end_x:
                x += 1
            elif x > end_x:
                x -= 1
            elif y < end_y:
                y += 1
            elif y > end_y:
                y -= 1
        
        return path + [(end_x, end_y)]
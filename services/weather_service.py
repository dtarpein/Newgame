import requests
import random
import time

class WeatherService:
    """Service for generating weather conditions and integrating with external weather APIs"""
    
    def __init__(self, api_key):
        """Initialize with API key for external weather service"""
        self.api_key = api_key
        
        # Weather conditions by region type
        self.region_weather = {
            'forest': ['sunny', 'cloudy', 'light_rain', 'heavy_rain', 'foggy'],
            'mountain': ['sunny', 'cloudy', 'snow', 'mist', 'storm', 'clear'],
            'desert': ['sunny', 'sandstorm', 'heat_wave', 'clear', 'windy'],
            'swamp': ['foggy', 'light_rain', 'heavy_rain', 'humid', 'stormy'],
            'town': ['sunny', 'cloudy', 'light_rain', 'clear', 'windy'],
            'dungeon': ['damp', 'dry', 'misty', 'stale', 'dark']
        }
        
        # Weather effects on gameplay
        self.weather_effects = {
            'sunny': {
                'description': 'The sun shines brightly overhead.',
                'effects': {}
            },
            'cloudy': {
                'description': 'Gray clouds fill the sky, blocking the sun.',
                'effects': {}
            },
            'light_rain': {
                'description': 'A gentle rain falls from the clouds above.',
                'effects': {'agility': -1, 'vision_range': -2}
            },
            'heavy_rain': {
                'description': 'Rain pours down in sheets, making it difficult to see.',
                'effects': {'agility': -2, 'vision_range': -5, 'movement_speed': -10}
            },
            'snow': {
                'description': 'Snowflakes drift down from the sky, covering the ground in white.',
                'effects': {'agility': -3, 'movement_speed': -20}
            },
            'mist': {
                'description': 'A thin mist hangs in the air, softening the edges of your vision.',
                'effects': {'vision_range': -3}
            },
            'foggy': {
                'description': 'Thick fog obscures your surroundings, making navigation difficult.',
                'effects': {'vision_range': -7}
            },
            'storm': {
                'description': 'Lightning flashes and thunder booms as a storm rages overhead.',
                'effects': {'agility': -3, 'vision_range': -6, 'movement_speed': -15}
            },
            'sandstorm': {
                'description': 'Sand whips through the air, stinging your skin and obscuring your vision.',
                'effects': {'agility': -2, 'vision_range': -8, 'movement_speed': -15}
            },
            'heat_wave': {
                'description': 'The air shimmers with intense heat, sapping your energy.',
                'effects': {'stamina_regen': -30, 'movement_speed': -10}
            },
            'clear': {
                'description': 'The air is clear and visibility is excellent.',
                'effects': {'vision_range': +2}
            },
            'windy': {
                'description': 'Strong winds blow through the area, making it harder to move in certain directions.',
                'effects': {'ranged_accuracy': -10}
            },
            'humid': {
                'description': 'The air is thick with humidity, making it harder to breathe.',
                'effects': {'stamina_regen': -15}
            },
            'stormy': {
                'description': 'Rain and wind lash at you as lightning illuminates the dark clouds above.',
                'effects': {'agility': -2, 'vision_range': -5, 'ranged_accuracy': -15}
            },
            'damp': {
                'description': 'The air is cold and damp, with moisture dripping from the walls.',
                'effects': {}
            },
            'dry': {
                'description': 'The air is uncomfortably dry, making your throat feel parched.',
                'effects': {}
            },
            'misty': {
                'description': 'Thin wisps of mist float through the air, creating an eerie atmosphere.',
                'effects': {'vision_range': -2}
            },
            'stale': {
                'description': 'The air is stale and unmoving, as if it hasn\'t been disturbed in ages.',
                'effects': {}
            },
            'dark': {
                'description': 'An unnatural darkness pervades the area, making it difficult to see.',
                'effects': {'vision_range': -6}
            }
        }
        
        # Weather transitions (which weather can follow another)
        self.weather_transitions = {
            'sunny': ['sunny', 'cloudy', 'clear', 'windy'],
            'cloudy': ['cloudy', 'light_rain', 'sunny', 'windy', 'foggy'],
            'light_rain': ['light_rain', 'heavy_rain', 'cloudy', 'foggy'],
            'heavy_rain': ['heavy_rain', 'light_rain', 'storm', 'cloudy'],
            'snow': ['snow', 'cloudy', 'mist', 'clear'],
            'mist': ['mist', 'foggy', 'cloudy', 'clear'],
            'foggy': ['foggy', 'mist', 'cloudy', 'light_rain'],
            'storm': ['storm', 'heavy_rain', 'cloudy', 'light_rain'],
            'sandstorm': ['sandstorm', 'windy', 'clear', 'sunny'],
            'heat_wave': ['heat_wave', 'sunny', 'clear', 'windy'],
            'clear': ['clear', 'sunny', 'cloudy', 'windy', 'mist'],
            'windy': ['windy', 'cloudy', 'clear', 'sunny', 'sandstorm', 'storm'],
            'humid': ['humid', 'foggy', 'light_rain', 'cloudy'],
            'stormy': ['stormy', 'heavy_rain', 'storm', 'cloudy']
        }
        
        # Cache for external weather API calls
        self.weather_cache = {}
        self.cache_timeout = 60 * 60  # 1 hour
    
    def get_weather_for_region(self, region, time_of_day, current_weather=None):
        """Get appropriate weather for a region"""
        # Get weather conditions appropriate for this region
        region_type = region.theme
        possible_weathers = self.region_weather.get(region_type, ['sunny', 'cloudy', 'clear'])
        
        # If we have current weather, use transitions to determine likely next weather
        if current_weather and current_weather in self.weather_transitions:
            possible_transitions = self.weather_transitions[current_weather]
            # 70% chance to transition, 30% chance to stay the same
            if random.random() < 0.7:
                next_weather = random.choice(possible_transitions)
            else:
                next_weather = current_weather
            
            # Only use the next weather if it's appropriate for this region
            if next_weather in possible_weathers:
                return next_weather
        
        # Otherwise just pick a random appropriate weather
        return random.choice(possible_weathers)
    
    def get_weather_effects(self, weather_condition):
        """Get gameplay effects for a weather condition"""
        return self.weather_effects.get(weather_condition, {
            'description': 'The weather is unremarkable.',
            'effects': {}
        })
    
    def get_real_world_weather(self, city):
        """Get weather from an external API based on real-world location"""
        # Check cache first
        now = time.time()
        if city in self.weather_cache and now - self.weather_cache[city]['timestamp'] < self.cache_timeout:
            return self.weather_cache[city]['data']
        
        try:
            url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={self.api_key}"
            response = requests.get(url, timeout=5)
            data = response.json()
            
            # Extract weather info
            if 'weather' in data and len(data['weather']) > 0:
                weather_id = data['weather'][0]['id']
                weather_main = data['weather'][0]['main'].lower()
                weather_description = data['weather'][0]['description'].lower()
                
                # Map external API weather to our game weather
                game_weather = self._map_external_weather_to_game(weather_id, weather_main, weather_description)
                
                # Cache the result
                self.weather_cache[city] = {
                    'timestamp': now,
                    'data': game_weather
                }
                
                return game_weather
            
            return 'clear'  # Default if can't parse response
        
        except Exception as e:
            print(f"Error getting external weather: {e}")
            return 'clear'  # Default on error
    
    def _map_external_weather_to_game(self, weather_id, weather_main, weather_description):
        """Map OpenWeatherMap conditions to game weather types"""
        # Thunderstorm
        if weather_id >= 200 and weather_id < 300:
            return 'storm' if weather_id >= 210 else 'stormy'
        
        # Drizzle
        if weather_id >= 300 and weather_id < 400:
            return 'light_rain'
        
        # Rain
        if weather_id >= 500 and weather_id < 600:
            if weather_id >= 502:  # Heavy intensity rain
                return 'heavy_rain'
            return 'light_rain'
        
        # Snow
        if weather_id >= 600 and weather_id < 700:
            return 'snow'
        
        # Atmosphere (fog, mist, etc.)
        if weather_id >= 700 and weather_id < 800:
            if 'fog' in weather_description:
                return 'foggy'
            if 'mist' in weather_description:
                return 'mist'
            return 'cloudy'
        
        # Clear
        if weather_id == 800:
            return 'sunny' if 'day' in weather_description else 'clear'
        
        # Clouds
        if weather_id > 800 and weather_id < 900:
            return 'cloudy'
        
        # Extreme
        if weather_id >= 900 and weather_id < 910:
            if weather_id == 905:  # Windy
                return 'windy'
            if weather_id == 904:  # Hot
                return 'heat_wave'
            if weather_id == 901 or weather_id == 902:  # Tropical storm or hurricane
                return 'storm'
            return 'stormy'
        
        # Additional
        if weather_id == 951:  # Calm
            return 'clear'
        if weather_id >= 952 and weather_id <= 956:  # Breeze to strong wind
            return 'windy'
        if weather_id >= 957 and weather_id <= 962:  # High wind to hurricane
            return 'storm'
        
        # Default
        return 'clear'
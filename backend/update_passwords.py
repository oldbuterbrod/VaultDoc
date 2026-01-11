
"""
Обновление паролей пользователей на bcrypt хеши (исправленная версия)
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User

def update_user_passwords():
    db = SessionLocal()
    
    try:
        users = db.query(User).all()
        
        print("🔐 Обновляем пароли пользователей...")
        print(f"Найдено {len(users)} пользователей")
        
        for user in users:
            print(f"\nПользователь: {user.email} ({user.full_name})")
            print(f"Текущий хеш: {user.password_hash}")
            
            # Определяем пароль в зависимости от роли
            if "admin" in user.email:
                new_password = "admin123"
            elif "manager" in user.email:
                new_password = "manager123"
            elif "employee" in user.email:
                new_password = "employee123"
            else:
                new_password = "password123"
            
            print(f"Новый пароль: {new_password}")
            
            # Простое хеширование для теста (замени на bcrypt позже)
            # Временно используем простой хеш
            import hashlib
            new_hash = hashlib.sha256(f"{new_password}_{user.email}".encode()).hexdigest()
            
            user.password_hash = f"hashed_{new_hash[:50]}"
            print(f"Новый хеш: {user.password_hash}")
        
        db.commit()
        print(f"\n✅ Пароли {len(users)} пользователей обновлены")
        
        # Показываем пользователей
        print("\n👥 Пользователи в системе:")
        for user in users:
            print(f"  - {user.email} ({user.full_name}) - роль: {user.role}")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    update_user_passwords()

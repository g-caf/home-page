document.addEventListener('DOMContentLoaded', function() {
    const text = document.querySelector('.circling-text');
    const textContent = text.textContent.trim();
    text.textContent = '';

    const radius = 75; // Distance from center to text

    for (let i = 0; i < textContent.length; i++) {
        const span = document.createElement('span');
        span.textContent = textContent[i];

        // Calculate angle for this character (start from top, go clockwise)
        const angle = (i / textContent.length) * 360;

        // First rotate, then translate outward
        // This creates the circular text effect
        span.style.transform = `rotate(${angle}deg) translateY(-${radius}px)`;

        text.appendChild(span);
    }
});

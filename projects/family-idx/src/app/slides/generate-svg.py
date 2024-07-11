duty_cycle = 0.666
duration = 8
num_bars = 33
bar_height = 15
bar_spacing = 2
max_delay = duration * (1-duty_cycle) 

print('''<svg width="600" height="561" viewbox="0 0 600 561" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" #animationMask>
    <style>
        @keyframes wave {
            0%% { transform: scaleX(0); }
            %.2f%% { transform: scaleX(1); }
            %.2f%% { transform: scaleX(0); }
        }
        .___bar {
            animation: wave %.2fs infinite;
            animation-timing-function: ease-in-out;
            transform-origin: left;
            transform: scaleX(0);
        }
    </style>''' % (duty_cycle/2 * 100, duty_cycle * 100, duration))
for i in range(num_bars):
    delay = i/num_bars * max_delay
    top = i * (bar_height + bar_spacing)
    print('    <rect style="animation-delay: %.3fs;" fill="#fff" height="%d" width="600" y="%d" x="0" class="___bar"></rect>' % (delay, bar_height, top))
print('</svg>')